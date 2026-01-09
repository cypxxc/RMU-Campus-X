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
  DocumentSnapshot
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"

// Helper to generate keywords
const generateKeywords = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase()
  // Split by whitespace and remove empty strings
  const words = text.split(/[\s,]+/).filter(w => w.length > 0)
  // Remove duplicates
  return Array.from(new Set(words))
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
}): Promise<ApiResponse<{ items: Item[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }>> => {
  return apiCall(
    async () => {
      const startTime = performance.now()
      const db = getFirebaseDb()
      const pageSize = filters?.pageSize || 20
      const constraints: QueryConstraint[] = [orderBy("postedAt", "desc"), limit(pageSize)]
      
      // Multi-category filter using 'in' operator (supports up to 30 values)
      if (filters?.categories && filters.categories.length > 0) {
        constraints.push(where("category", "in", filters.categories))
      }
      if (filters?.status) constraints.push(where("status", "==", filters.status))
      
      if (filters?.searchQuery) {
        // Simple search: check if 'searchKeywords' contains the first word of the query
        // Limitation: Firestore 'array-contains' only allows one value for equality checks combined with other filters in some cases,
        // and 'array-contains-any' allows up to 10.
        // For simplicity and "starts with" emulation, we might rely on exact match of tokens.
        
        const terms = filters.searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0)
        
        if (terms.length > 0) {
           // We take the first term for the server-side filter to narrow down results.
           // Ideally we'd use array-contains-any[...terms] but that's OR logic.
           // We use array-contains for the first term as a primary filter.
           // Note: Compound queries with array-contains and other equality clauses work.
           // But array-contains + orderBy range/inequality has limitations.
           
           // Strategy: Use array-contains for the first meaningful keyword.
           // This requires an index if mixed with other fields.
           
           constraints.push(where("searchKeywords", "array-contains", terms[0]))
        }
      }
      
      if (filters?.lastDoc) constraints.push(startAfter(filters.lastDoc))

      const q = query(collection(db, "items"), ...constraints)
      const snapshot = await getDocs(q)
      let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)
      
      // If we used a search query, do a quick in-memory refinement for other terms (AND logic)
      if (filters?.searchQuery) {
          const terms = filters.searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0)
          if (terms.length > 1) {
              items = items.filter(item => {
                  const combined = `${item.title} ${item.description}`.toLowerCase()
                  return terms.every(term => combined.includes(term))
              })
          }
      }
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
      
      // Log query performance
      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Query] getItems: ${duration.toFixed(2)}ms, ${items.length} items`)
      }
      
      return { items, lastDoc: lastVisible, hasMore: snapshot.docs.length === pageSize }
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
