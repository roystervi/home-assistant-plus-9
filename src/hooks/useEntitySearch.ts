import { useState, useCallback, useRef, useEffect } from 'react';

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

export interface SearchOptions {
  domain?: string;
  deviceClass?: string;
  state?: string;
  limit?: number;
}

export interface SearchResult {
  entities: HomeAssistantEntity[];
  total: number;
  query: string;
  timestamp: number;
}

interface CacheEntry extends SearchResult {
  expiresAt: number;
}

interface UseEntitySearchResult {
  searchEntities: (query: string, options?: SearchOptions) => Promise<void>;
  results: HomeAssistantEntity[];
  isLoading: boolean;
  error: string | null;
  clearCache: () => void;
  getRecentEntities: () => HomeAssistantEntity[];
  lastQuery: string;
  totalResults: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useEntitySearch = (): UseEntitySearchResult => {
  const [results, setResults] = useState<HomeAssistantEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [totalResults, setTotalResults] = useState(0);

  // Cache and refs
  const cacheRef = useRef(new Map<string, CacheEntry>());
  const recentEntitiesRef = useRef<HomeAssistantEntity[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Generate cache key
  const getCacheKey = useCallback((query: string, options?: SearchOptions): string => {
    const key = {
      query: query.toLowerCase().trim(),
      domain: options?.domain,
      deviceClass: options?.deviceClass,
      state: options?.state,
      limit: options?.limit,
    };
    return JSON.stringify(key);
  }, []);

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() < entry.expiresAt;
  }, []);

  // Clean expired cache entries
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    for (const [key, entry] of cache.entries()) {
      if (now >= entry.expiresAt) {
        cache.delete(key);
      }
    }
  }, []);

  // Sleep utility for retry delays
  const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

  // Perform API request with retry logic
  const performSearch = useCallback(async (
    query: string, 
    options: SearchOptions = {},
    retryCount = 0
  ): Promise<SearchResult> => {
    const url = new URL('/api/homeassistant/entities/search', window.location.origin);
    
    // Add query parameters
    url.searchParams.set('q', query);
    if (options.domain) url.searchParams.set('domain', options.domain);
    if (options.deviceClass) url.searchParams.set('device_class', options.deviceClass);
    if (options.state) url.searchParams.set('state', options.state);
    if (options.limit) url.searchParams.set('limit', options.limit.toString());

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 401) {
          throw new Error('Authentication required. Please check your Home Assistant credentials.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your Home Assistant permissions.');
        } else if (response.status === 404) {
          throw new Error('Home Assistant API endpoint not found.');
        } else if (response.status >= 500) {
          throw new Error('Home Assistant server error. Please try again later.');
        } else {
          throw new Error(`Search failed with status ${response.status}`);
        }
      }

      const data = await response.json();
      
      return {
        entities: data.entities || [],
        total: data.total || 0,
        query,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      // Don't retry if request was aborted
      if (error.name === 'AbortError') {
        throw error;
      }

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && (
        error.name === 'TypeError' || // Network error
        error.message.includes('fetch') ||
        error.message.includes('server error')
      )) {
        await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return performSearch(query, options, retryCount + 1);
      }

      throw error;
    }
  }, []);

  // Main search function
  const searchEntities = useCallback(async (
    query: string, 
    options: SearchOptions = {}
  ): Promise<void> => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const trimmedQuery = query.trim();
    
    // Clear results for empty query
    if (!trimmedQuery) {
      setResults([]);
      setTotalResults(0);
      setLastQuery('');
      setError(null);
      return;
    }

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLastQuery(trimmedQuery);

        // Check cache first
        const cacheKey = getCacheKey(trimmedQuery, options);
        const cachedResult = cacheRef.current.get(cacheKey);

        if (cachedResult && isCacheValid(cachedResult)) {
          setResults(cachedResult.entities);
          setTotalResults(cachedResult.total);
          setIsLoading(false);
          return;
        }

        // Perform search
        const searchResult = await performSearch(trimmedQuery, options);

        // Cache the result
        cacheRef.current.set(cacheKey, {
          ...searchResult,
          expiresAt: Date.now() + CACHE_DURATION,
        });

        // Update state
        setResults(searchResult.entities);
        setTotalResults(searchResult.total);

        // Update recent entities (avoid duplicates)
        if (searchResult.entities.length > 0) {
          const newRecent = searchResult.entities.slice(0, 5);
          recentEntitiesRef.current = [
            ...newRecent,
            ...recentEntitiesRef.current.filter(
              entity => !newRecent.some(newEntity => newEntity.entity_id === entity.entity_id)
            ),
          ].slice(0, 20); // Keep max 20 recent entities
        }

        // Clean expired cache entries periodically
        cleanExpiredCache();

      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Entity search error:', error);
          setError(error.message || 'An error occurred while searching entities');
          setResults([]);
          setTotalResults(0);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, [getCacheKey, isCacheValid, performSearch, cleanExpiredCache]);

  // Clear cache function
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    recentEntitiesRef.current = [];
  }, []);

  // Get recent entities function
  const getRecentEntities = useCallback((): HomeAssistantEntity[] => {
    return [...recentEntitiesRef.current];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchEntities,
    results,
    isLoading,
    error,
    clearCache,
    getRecentEntities,
    lastQuery,
    totalResults,
  };
};