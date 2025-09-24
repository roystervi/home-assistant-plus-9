import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting constants
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute per IP

// Request validation schema
interface WebSearchRequest {
  query: string
  num_results?: number
  search_type?: 'web' | 'news'
  time_filter?: 'day' | 'week' | 'month' | 'year' | 'all'
  language?: string
  region?: string
}

// Response interface
interface WebSearchResponse {
  success: boolean
  results: Array<{
    title: string
    url: string
    snippet: string
    published_date?: string
    source: string
    score?: number
    type: string
  }>
  total_results: number
  query: string
  search_time: number
  suggestions?: string[]
  error?: string
}

// Initialize Exa client
function getExaClient() {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    throw new Error('EXA_API_KEY environment variable is required')
  }
  return new Exa(apiKey)
}

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

// Input sanitization
function sanitizeQuery(query: string): string {
  // Remove potentially harmful characters and excessive whitespace
  return query
    .replace(/[<>\"']/g, '') // Remove HTML/script injection chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 500) // Limit query length
}

// Validate request parameters
function validateRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.query || typeof body.query !== 'string') {
    errors.push('Query parameter is required and must be a string')
  } else if (body.query.trim().length === 0) {
    errors.push('Query cannot be empty')
  }

  if (body.num_results !== undefined) {
    if (typeof body.num_results !== 'number' || body.num_results < 1 || body.num_results > 20) {
      errors.push('num_results must be a number between 1 and 20')
    }
  }

  if (body.search_type !== undefined) {
    if (!['web', 'news'].includes(body.search_type)) {
      errors.push('search_type must be either "web" or "news"')
    }
  }

  if (body.time_filter !== undefined) {
    if (!['day', 'week', 'month', 'year', 'all'].includes(body.time_filter)) {
      errors.push('time_filter must be one of: day, week, month, year, all')
    }
  }

  return { isValid: errors.length === 0, errors }
}

// Format Exa results to match our response schema
function formatResults(exaResults: any[], searchType: string): WebSearchResponse['results'] {
  return exaResults.map((result, index) => ({
    title: result.title || 'Untitled',
    url: result.url || '',
    snippet: result.text || result.summary || '',
    published_date: result.publishedDate || undefined,
    source: extractDomain(result.url || ''),
    score: result.score || (1 - index * 0.1), // Fallback scoring
    type: searchType
  }))
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch {
    return 'Unknown'
  }
}

// Get time filter for Exa API
function getExaTimeFilter(timeFilter?: string): string | undefined {
  switch (timeFilter) {
    case 'day':
      return '1d'
    case 'week':
      return '1w'
    case 'month':
      return '1m'
    case 'year':
      return '1y'
    default:
      return undefined
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    console.log(`[WebSearch] Request from IP: ${ip}`)

    // Check rate limit
    if (!checkRateLimit(ip)) {
      console.log(`[WebSearch] Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          results: [],
          total_results: 0,
          query: '',
          search_time: 0
        },
        { status: 429 }
      )
    }

    // Parse request body
    let body: WebSearchRequest
    try {
      body = await request.json()
    } catch (error) {
      console.error('[WebSearch] Invalid JSON:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          results: [],
          total_results: 0,
          query: '',
          search_time: Date.now() - startTime
        },
        { status: 400 }
      )
    }

    // Validate request
    const validation = validateRequest(body)
    if (!validation.isValid) {
      console.error('[WebSearch] Validation errors:', validation.errors)
      return NextResponse.json(
        {
          success: false,
          error: `Validation errors: ${validation.errors.join(', ')}`,
          results: [],
          total_results: 0,
          query: body.query || '',
          search_time: Date.now() - startTime
        },
        { status: 400 }
      )
    }

    // Sanitize and prepare search parameters
    const sanitizedQuery = sanitizeQuery(body.query)
    const numResults = body.num_results || 5
    const searchType = body.search_type || 'web'
    const timeFilter = body.time_filter || 'all'

    console.log(`[WebSearch] Searching for: "${sanitizedQuery}" (${searchType}, ${numResults} results, ${timeFilter})`)

    // Initialize Exa client
    let exa: Exa
    try {
      exa = getExaClient()
    } catch (error) {
      console.error('[WebSearch] Failed to initialize Exa client:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Search service configuration error',
          results: [],
          total_results: 0,
          query: sanitizedQuery,
          search_time: Date.now() - startTime
        },
        { status: 500 }
      )
    }

    // Perform search
    let searchResults: any
    try {
      const searchOptions: any = {
        query: sanitizedQuery,
        numResults: numResults,
        contents: {
          text: true,
          summary: true
        },
        includeDomains: body.region ? undefined : undefined, // Could implement region filtering
        startPublishedDate: getExaTimeFilter(timeFilter)
      }

      // Use different search types based on request
      if (searchType === 'news') {
        searchOptions.category = 'news'
        searchOptions.useAutoprompt = true
      }

      console.log('[WebSearch] Exa search options:', JSON.stringify(searchOptions, null, 2))

      searchResults = await exa.searchAndContents(searchOptions)
      
      console.log(`[WebSearch] Exa returned ${searchResults.results?.length || 0} results`)
    } catch (error: any) {
      console.error('[WebSearch] Exa search failed:', error)
      
      // Handle specific Exa API errors
      let errorMessage = 'Search service temporarily unavailable'
      let statusCode = 500

      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        errorMessage = 'Search service authentication failed'
        statusCode = 401
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        errorMessage = 'Search service quota exceeded'
        statusCode = 429
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          results: [],
          total_results: 0,
          query: sanitizedQuery,
          search_time: Date.now() - startTime
        },
        { status: statusCode }
      )
    }

    // Format results
    const formattedResults = formatResults(searchResults.results || [], searchType)
    const searchTime = Date.now() - startTime

    console.log(`[WebSearch] Search completed in ${searchTime}ms, returning ${formattedResults.length} results`)

    // Build response
    const response: WebSearchResponse = {
      success: true,
      results: formattedResults,
      total_results: formattedResults.length,
      query: sanitizedQuery,
      search_time: searchTime,
      suggestions: [], // Exa doesn't provide suggestions by default
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[WebSearch] Unexpected error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        results: [],
        total_results: 0,
        query: '',
        search_time: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check if Exa API key is configured
    const apiKey = process.env.EXA_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'EXA_API_KEY not configured'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'web-search',
      timestamp: new Date().toISOString(),
      rate_limit_active: true
    })
  } catch (error) {
    console.error('[WebSearch] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Service health check failed'
      },
      { status: 500 }
    )
  }
}