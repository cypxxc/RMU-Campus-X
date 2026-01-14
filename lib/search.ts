/**
 * Enhanced Search Utilities
 * Full-text search with fuzzy matching and relevance scoring
 * 
 * For production with large data, consider:
 * - Algolia (recommended for real-time search)
 * - Meilisearch (self-hosted alternative)
 * - Firebase Extensions: Search with Algolia
 */

export interface SearchOptions {
  fuzzy?: boolean
  caseSensitive?: boolean
  maxResults?: number
  minScore?: number
}

export interface SearchResult<T> {
  item: T
  score: number
  matches: string[]
}

/**
 * Simple tokenizer
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\wก-๙]/g, ' ') // Keep Thai characters
    .split(/\s+/)
    .filter(token => token.length > 1)
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length]![a.length]!
}

/**
 * Calculate similarity score (0-1)
 */
function similarityScore(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  // Exact match
  if (textLower === queryLower) return 1

  // Contains match
  if (textLower.includes(queryLower)) {
    return 0.9 - (textLower.indexOf(queryLower) / textLower.length) * 0.1
  }

  // Starts with match
  if (textLower.startsWith(queryLower)) {
    return 0.95
  }

  // Token match
  const queryTokens = tokenize(query)
  const textTokens = tokenize(text)
  
  let matchedTokens = 0
  for (const qToken of queryTokens) {
    if (textTokens.some(tToken => tToken.includes(qToken) || qToken.includes(tToken))) {
      matchedTokens++
    }
  }
  
  if (matchedTokens > 0) {
    return 0.5 + (matchedTokens / queryTokens.length) * 0.3
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(queryLower, textLower)
  const maxLen = Math.max(queryLower.length, textLower.length)
  const fuzzyScore = 1 - distance / maxLen

  return Math.max(0, fuzzyScore - 0.3) // Require at least 30% similarity
}

/**
 * Search items with relevance scoring
 */
export function searchItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  options: SearchOptions = {}
): SearchResult<T>[] {
  const {
    fuzzy = true,
    maxResults = 50,
    minScore = 0.3,
  } = options

  if (!query.trim()) {
    return items.slice(0, maxResults).map(item => ({
      item,
      score: 1,
      matches: [],
    }))
  }

  const results: SearchResult<T>[] = []

  for (const item of items) {
    let totalScore = 0
    const matches: string[] = []

    for (const field of searchFields) {
      const value = item[field]
      if (typeof value !== 'string') continue

      const score = similarityScore(query, value)
      if (score >= minScore) {
        totalScore = Math.max(totalScore, score)
        if (score > 0.5) {
          matches.push(String(field))
        }
      }
    }

    if (totalScore >= minScore || (!fuzzy && totalScore > 0)) {
      results.push({
        item,
        score: totalScore,
        matches,
      })
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, maxResults)
}

/**
 * Highlight search query in text
 */
export function highlightMatches(
  text: string,
  query: string,
  highlightClass = 'bg-yellow-200 dark:bg-yellow-900'
): string {
  if (!query.trim()) return text

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  
  return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`)
}

/**
 * Generate search suggestions based on common terms
 */
export function generateSuggestions(
  query: string,
  availableTerms: string[],
  maxSuggestions = 5
): string[] {
  if (!query.trim()) return []

  const suggestions = availableTerms
    .map(term => ({
      term,
      score: similarityScore(query, term),
    }))
    .filter(s => s.score > 0.3 && s.term.toLowerCase() !== query.toLowerCase())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map(s => s.term)

  return suggestions
}

/**
 * Build search index for faster searching (for large datasets)
 */
export class SearchIndex<T extends Record<string, unknown>> {
  private tokenIndex = new Map<string, Set<number>>()
  private items: T[] = []
  private searchFields: (keyof T)[]

  constructor(searchFields: (keyof T)[]) {
    this.searchFields = searchFields
  }

  /**
   * Add items to the index
   */
  index(items: T[]): void {
    this.items = items

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      
      for (const field of this.searchFields) {
        const value = item[field]
        if (typeof value !== 'string') continue

        const tokens = tokenize(value)
        for (const token of tokens) {
          if (!this.tokenIndex.has(token)) {
            this.tokenIndex.set(token, new Set())
          }
          this.tokenIndex.get(token)!.add(i)
        }
      }
    }
  }

  /**
   * Search the index
   */
  search(query: string, maxResults = 50): T[] {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) {
      return this.items.slice(0, maxResults)
    }

    const candidateIndices = new Map<number, number>()

    for (const token of queryTokens) {
      // Exact token match
      const indices = this.tokenIndex.get(token)
      if (indices) {
        indices.forEach(i => {
          candidateIndices.set(i, (candidateIndices.get(i) || 0) + 2)
        })
      }

      // Prefix match
      this.tokenIndex.forEach((indices, indexedToken) => {
        if (indexedToken.startsWith(token)) {
          indices.forEach(i => {
            candidateIndices.set(i, (candidateIndices.get(i) || 0) + 1)
          })
        }
      })
    }

    // Sort by score and return top results
    return Array.from(candidateIndices.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults)
      .map(([index]) => this.items[index]!)
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.tokenIndex.clear()
    this.items = []
  }
}
