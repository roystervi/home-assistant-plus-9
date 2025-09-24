"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2, AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
    device_class?: string;
    icon?: string;
    [key: string]: any;
  };
  last_changed: string;
  last_updated: string;
}

interface EntityAutocompleteProps {
  value?: string;
  onEntitySelect: (entityId: string) => void;
  placeholder?: string;
  domain?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export const EntityAutocomplete: React.FC<EntityAutocompleteProps> = ({
  value = '',
  onEntitySelect,
  placeholder = 'Search entities...',
  domain,
  disabled = false,
  className,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entities, setEntities] = useState<EntityState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Get friendly name or fallback to entity ID
  const getDisplayName = useCallback((entity: EntityState) => {
    return entity.attributes.friendly_name || entity.entity_id;
  }, []);

  // Get domain from entity ID
  const getDomain = useCallback((entityId: string) => {
    return entityId.split('.')[0];
  }, []);

  // Format state value with unit if available
  const formatState = useCallback((entity: EntityState) => {
    const { state, attributes } = entity;
    if (state === 'unavailable' || state === 'unknown') {
      return state;
    }
    if (attributes.unit_of_measurement) {
      return `${state} ${attributes.unit_of_measurement}`;
    }
    return state;
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setEntities([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', '20');
      
      if (domain) {
        params.append('domain', domain);
      }

      const response = await fetch(`/api/homeassistant/entities/search?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch entities: ${response.statusText}`);
      }

      const fetchedEntities: EntityState[] = await response.json();
      setEntities(fetchedEntities);
      setSelectedIndex(-1);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setSearchError(err.message);
        setEntities([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  // Handle search input change with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < entities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && entities[selectedIndex]) {
          handleEntitySelect(entities[selectedIndex].entity_id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, entities, selectedIndex]);

  // Handle entity selection
  const handleEntitySelect = useCallback((entityId: string) => {
    onEntitySelect(entityId);
    setIsOpen(false);
    setSearchQuery('');
    setEntities([]);
    setSelectedIndex(-1);
  }, [onEntitySelect]);

  // Handle clear selection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEntitySelect('');
    setSearchQuery('');
    setEntities([]);
    setSelectedIndex(-1);
  }, [onEntitySelect]);

  // Handle retry search
  const handleRetry = useCallback(() => {
    setSearchError(null);
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  // Find selected entity for display
  const selectedEntity = entities.find(entity => entity.entity_id === value);
  const displayValue = value ? (selectedEntity ? getDisplayName(selectedEntity) : value) : '';

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={isOpen ? searchQuery : displayValue}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                  'pl-10 pr-10',
                  error && 'border-destructive focus-visible:ring-destructive'
                )}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Search Home Assistant entities"
                role="combobox"
              />
              {(value || searchQuery) && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  onClick={handleClear}
                  aria-label="Clear selection"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Searching entities...</span>
                </div>
              ) : searchError ? (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive text-center mb-3">{searchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </Button>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <Home className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Type at least 2 characters to search entities
                  </p>
                </div>
              ) : entities.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center justify-center py-6">
                    <Search className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No entities found</p>
                    {domain && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Searching in domain: {domain}
                      </p>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  <ScrollArea className="max-h-80">
                    {entities.map((entity, index) => (
                      <CommandItem
                        key={entity.entity_id}
                        value={entity.entity_id}
                        onSelect={() => handleEntitySelect(entity.entity_id)}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 cursor-pointer',
                          index === selectedIndex && 'bg-accent',
                          value === entity.entity_id && 'bg-primary/10 border-l-2 border-primary'
                        )}
                        aria-selected={index === selectedIndex}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {getDisplayName(entity)}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className="text-xs shrink-0"
                            >
                              {getDomain(entity.entity_id)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {entity.entity_id}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            State: {formatState(entity)}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};