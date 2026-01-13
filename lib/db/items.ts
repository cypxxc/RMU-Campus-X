import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
  getCountFromServer
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"

// Helper to generate keywords with prefixes
const generateKeywords = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase()
  // Split by whitespace and remove empty strings
  const words = text.split(/[\s,]+/).filter(w => w.length > 0)
  
  const keywords = new Set<string>()
  words.forEach(word => {
    // Add full word
    keywords.add(word)
    // Add prefixes (e.g. "notebook" -> "not", "note", "noteb"...)
    // Min length 3 to avoid noise
    for (let i = 3; i < word.length; i++) {
      keywords.add(word.substring(0, i))
    }
  })
  
  return Array.from(keywords)
}

// Items
export const createItem = async (itemData: Omit<Item, "id" | "postedAt" | "updatedAt">) => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const searchKeywords = generateKeywords(itemData.title, itemData.description)
      
      const docRef = await addDoc(collection(db, "items"), {
        ...itemData,
        searchKeywords,
        postedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    'createItem',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItems = async (filters?: { 
  categories?: ItemCategory[]; 
  status?: ItemStatus;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
  searchQuery?: string;
}): Promise<ApiResponse<{ items: Item[]; lastDoc: DocumentSnapshot | null; hasMore: boolean; totalCount: number }>> => {
  return apiCall(
    async () => {
      const startTime = performance.now()
      const db = getFirebaseDb()
      const pageSize = filters?.pageSize || 20
      
      // Base constraints for both count and data queries
      const baseConstraints: QueryConstraint[] = []
      
      // Multi-category filter using 'in' operator
      if (filters?.categories && filters.categories.length > 0) {
        baseConstraints.push(where("category", "in", filters.categories))
      }
      if (filters?.status) {
        baseConstraints.push(where("status", "==", filters.status))
      }
      
      // Search logic for base filtering
      let searchTerms: string[] = []
      if (filters?.searchQuery) {
        searchTerms = filters.searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0)
        if (searchTerms.length > 0) {
           // Improved: Use array-contains-any to find ANY matching term, then filter strict matches in-memory
           // Limit to 10 terms due to Firestore constraint
           baseConstraints.push(where("searchKeywords", "array-contains-any", searchTerms.slice(0, 10)))
        }
      }

      // 1. Get total count
      let totalCount = 0
      try {
        const countQ = query(collection(db, "items"), ...baseConstraints)
        const countSnapshot = await getCountFromServer(countQ)
        totalCount = countSnapshot.data().count
      } catch (error) {
        console.warn("Count query failed", error)
      }

      // 2. Get data
      const dataConstraints = [...baseConstraints, orderBy("postedAt", "desc"), limit(pageSize)]
      if (filters?.lastDoc) dataConstraints.push(startAfter(filters.lastDoc))

      const q = query(collection(db, "items"), ...dataConstraints)
      const snapshot = await getDocs(q)
      let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)
      
      // In-memory refinement for ALL terms (Intersection)
      if (searchTerms.length > 0) {
          items = items.filter(item => {
              const combined = `${item.title} ${item.description}`.toLowerCase()
              return searchTerms.every(term => combined.includes(term))
          })
      }
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
      
      // Log query performance
      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Query] getItems: ${duration.toFixed(2)}ms, ${items.length} items, total: ${totalCount}`)
      }
      
      return { 
        items, 
        lastDoc: lastVisible, 
        hasMore: snapshot.docs.length === pageSize,
        totalCount
      }
    },
    'getItems',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItemById = async (id: string): Promise<ApiResponse<Item | null>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "items", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Item
      }
      return null
    },
    'getItemById',
    TIMEOUT_CONFIG.QUICK
  )
}

export const updateItem = async (id: string, data: Partial<Item>): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "items", id)
      
      // Check if document exists before updating
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error(`Item with ID ${id} does not exist`)
      }
      
      const updates: any = {
        ...data,
        updatedAt: serverTimestamp(),
      }
      
      // If title or description is updated, regenerate keywords
      if (data.title || data.description) {
          const currentData = docSnap.data() as Item
          
          // Guard: Prevent editing if item is pending
          if (currentData.status === 'pending') {
              throw new Error("Cannot edit item details while an exchange is pending")
          }

          const newTitle = data.title || currentData.title
          const newDesc = data.description || currentData.description
          updates.searchKeywords = generateKeywords(newTitle, newDesc)
      }
      
      await updateDoc(docRef, updates)
    },
    'updateItem',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const deleteItem = async (id: string): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "items", id))
    },
    'deleteItem',
    TIMEOUT_CONFIG.STANDARD
  )
}
