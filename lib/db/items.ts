import {
  collection,
  addDoc,
  updateDoc,
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
import { buildSearchConstraints, generateKeywords, refineItemsBySearchTerms } from "./items-helpers"

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
      const { searchTerms, constraints: searchConstraints } = buildSearchConstraints(filters?.searchQuery)
      baseConstraints.push(...searchConstraints)

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
          items = refineItemsBySearchTerms(items, searchTerms)
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
          
          // NOTE: Business rule validation (e.g., pending status check)
          // is now handled in lib/services/items/item-update.ts
          // This layer only handles data persistence

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
      // db unused
      // const db = getFirebaseDb()
      
      // We need to pass Auth Token to API
      // Wait.. lib/db/items runs on client.
      // fetch needs token.
      
      // Dynamic import to avoid circular dep issues if any, or just standard import
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()
      
      if (!token) throw new Error("Authentication required")

      const response = await fetch(`/api/items/${id}`, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${token}`
          }
      })

      if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to delete item")
      }
    },
    'deleteItem',
    TIMEOUT_CONFIG.STANDARD
  )
}
