// ============================================================
// Item Repository - Abstraction over Firestore
// ============================================================

import type { Item, ItemCategory, ItemStatus } from "@/types"
import type { IRepository, PaginatedResult, RepositoryError } from "./types"

// ============ Types ============

export interface ItemFilters {
  categories?: ItemCategory[]
  status?: ItemStatus
  postedBy?: string
  searchQuery?: string
}

export interface ItemCreateInput {
  title: string
  description: string
  category: ItemCategory
  location?: string
  locationDetail?: string
  imageUrls?: string[]
  postedBy: string
  postedByEmail: string
  postedByName?: string
}

export interface ItemUpdateInput {
  title?: string
  description?: string
  category?: ItemCategory
  location?: string
  locationDetail?: string
  imageUrls?: string[]
  status?: ItemStatus
}

export interface IItemRepository extends IRepository<Item, ItemCreateInput, ItemUpdateInput> {
  findByOwner(ownerId: string): Promise<Item[]>
  findPaginated(filters?: ItemFilters, pageSize?: number, lastDoc?: unknown): Promise<PaginatedResult<Item>>
  updateStatus(id: string, status: ItemStatus): Promise<void>
}

// ============ Firestore Implementation ============

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  getCountFromServer,
  DocumentSnapshot,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { generateKeywords, buildSearchConstraints, refineItemsBySearchTerms } from "@/lib/db/items-helpers"

export class FirestoreItemRepository implements IItemRepository {
  private collectionName = "items"

  private getCollection() {
    return collection(getFirebaseDb(), this.collectionName)
  }

  async findById(id: string): Promise<Item | null> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Item
  }

  async findAll(): Promise<Item[]> {
    const q = query(this.getCollection(), orderBy("postedAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)
  }

  async findByOwner(ownerId: string): Promise<Item[]> {
    const q = query(
      this.getCollection(),
      where("postedBy", "==", ownerId),
      orderBy("postedAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)
  }

  async findPaginated(
    filters?: ItemFilters,
    pageSize = 20,
    lastDoc?: unknown
  ): Promise<PaginatedResult<Item>> {
    const constraints: any[] = []

    if (filters?.categories && filters.categories.length > 0) {
      constraints.push(where("category", "in", filters.categories))
    }
    if (filters?.status) {
      constraints.push(where("status", "==", filters.status))
    }
    if (filters?.postedBy) {
      constraints.push(where("postedBy", "==", filters.postedBy))
    }

    // Search handling
    const { searchTerms, constraints: searchConstraints } = buildSearchConstraints(
      filters?.searchQuery
    )
    constraints.push(...searchConstraints)

    // Get total count
    let total = 0
    try {
      const countQ = query(this.getCollection(), ...constraints)
      const countSnapshot = await getCountFromServer(countQ)
      total = countSnapshot.data().count
    } catch {
      // Count may fail, continue without it
    }

    // Get data
    const dataConstraints = [...constraints, orderBy("postedAt", "desc"), limit(pageSize)]
    if (lastDoc) {
      dataConstraints.push(startAfter(lastDoc as DocumentSnapshot))
    }

    const q = query(this.getCollection(), ...dataConstraints)
    const snapshot = await getDocs(q)
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)

    // In-memory refinement for search
    if (searchTerms.length > 0) {
      items = refineItemsBySearchTerms(items, searchTerms)
    }

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null

    return {
      items,
      total,
      hasMore: snapshot.docs.length === pageSize,
      lastDoc: lastVisible,
    }
  }

  async create(data: ItemCreateInput): Promise<Item> {
    const searchKeywords = generateKeywords(data.title, data.description)
    const docRef = await addDoc(this.getCollection(), {
      ...data,
      status: "available" as ItemStatus,
      searchKeywords,
      postedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const created = await this.findById(docRef.id)
    if (!created) throw new Error("Failed to create item")
    return created
  }

  async update(id: string, data: ItemUpdateInput): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    const existing = await getDoc(docRef)
    if (!existing.exists()) {
      throw new Error(`Item ${id} not found`)
    }

    const updates: any = { ...data, updatedAt: serverTimestamp() }

    // Regenerate keywords if title or description changed
    if (data.title || data.description) {
      const current = existing.data() as Item
      const newTitle = data.title || current.title
      const newDesc = data.description || current.description
      updates.searchKeywords = generateKeywords(newTitle, newDesc)
    }

    await updateDoc(docRef, updates)
  }

  async updateStatus(id: string, status: ItemStatus): Promise<void> {
    await this.update(id, { status })
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    await deleteDoc(docRef)
  }
}

// ============ Factory ============

export function createItemRepository(): IItemRepository {
  return new FirestoreItemRepository()
}
