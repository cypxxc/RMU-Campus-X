import { where, type QueryConstraint } from "firebase/firestore"
import type { Item } from "@/types"

// Helper to generate keywords with prefixes
export const generateKeywords = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase()
  const words = text.split(/[\\s,]+/).filter(w => w.length > 0)

  const keywords = new Set<string>()
  words.forEach(word => {
    keywords.add(word)
    for (let i = 3; i < word.length; i++) {
      keywords.add(word.substring(0, i))
    }
  })

  return Array.from(keywords)
}

export function buildSearchConstraints(searchQuery?: string): {
  searchTerms: string[]
  constraints: QueryConstraint[]
} {
  let searchTerms: string[] = []
  const constraints: QueryConstraint[] = []

  if (searchQuery) {
    searchTerms = searchQuery.toLowerCase().split(/\\s+/).filter(t => t.length > 0)
    if (searchTerms.length > 0) {
      constraints.push(where("searchKeywords", "array-contains-any", searchTerms.slice(0, 10)))
    }
  }

  return { searchTerms, constraints }
}

export function refineItemsBySearchTerms(items: Item[], searchTerms: string[]): Item[] {
  if (searchTerms.length === 0) return items

  return items.filter(item => {
    const combined = `${item.title} ${item.description}`.toLowerCase()
    return searchTerms.every(term => combined.includes(term))
  })
}
