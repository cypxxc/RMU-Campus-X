// ============================================================
// Exchange Repository - Abstraction over Firestore
// ============================================================

import type { Exchange, ExchangeStatus } from "@/types"
import type { IRepository, PaginatedResult } from "./types"

// ============ Types ============

export interface ExchangeCreateInput {
  itemId: string
  itemTitle: string
  ownerId: string
  ownerEmail: string
  requesterId: string
  requesterEmail: string
}

export interface ExchangeUpdateInput {
  status?: ExchangeStatus
  ownerConfirmed?: boolean
  requesterConfirmed?: boolean
  cancelReason?: string
  cancelledBy?: string
}

export interface ExchangeFilters {
  itemId?: string
  ownerId?: string
  requesterId?: string
  status?: ExchangeStatus | ExchangeStatus[]
}

export interface IExchangeRepository extends IRepository<Exchange, ExchangeCreateInput, ExchangeUpdateInput> {
  findByItem(itemId: string): Promise<Exchange[]>
  findByUser(userId: string): Promise<Exchange[]>
  findActiveByItem(itemId: string): Promise<Exchange | null>
  updateStatus(id: string, status: ExchangeStatus): Promise<void>
  confirmByUser(id: string, userId: string, role: 'owner' | 'requester'): Promise<void>
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
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

export class FirestoreExchangeRepository implements IExchangeRepository {
  private collectionName = "exchanges"

  private getCollection() {
    return collection(getFirebaseDb(), this.collectionName)
  }

  async findById(id: string): Promise<Exchange | null> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Exchange
  }

  async findAll(): Promise<Exchange[]> {
    const q = query(this.getCollection(), orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange)
  }

  async findByItem(itemId: string): Promise<Exchange[]> {
    const q = query(
      this.getCollection(),
      where("itemId", "==", itemId),
      orderBy("createdAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange)
  }

  async findActiveByItem(itemId: string): Promise<Exchange | null> {
    const q = query(
      this.getCollection(),
      where("itemId", "==", itemId),
      where("status", "in", ["pending", "accepted", "in_progress"])
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as Exchange
  }

  async findByUser(userId: string): Promise<Exchange[]> {
    // Firebase doesn't support OR queries well, so we do two queries
    const [ownerExchanges, requesterExchanges] = await Promise.all([
      getDocs(
        query(
          this.getCollection(),
          where("ownerId", "==", userId),
          orderBy("createdAt", "desc")
        )
      ),
      getDocs(
        query(
          this.getCollection(),
          where("requesterId", "==", userId),
          orderBy("createdAt", "desc")
        )
      ),
    ])

    const allExchanges = [
      ...ownerExchanges.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange),
      ...requesterExchanges.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange),
    ]

    // Remove duplicates and sort
    const unique = Array.from(new Map(allExchanges.map((e) => [e.id, e])).values())
    return unique.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0
      const bTime = b.createdAt?.seconds || 0
      return bTime - aTime
    })
  }

  async create(data: ExchangeCreateInput): Promise<Exchange> {
    const docRef = await addDoc(this.getCollection(), {
      ...data,
      status: "pending" as ExchangeStatus,
      ownerConfirmed: false,
      requesterConfirmed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const created = await this.findById(docRef.id)
    if (!created) throw new Error("Failed to create exchange")
    return created
  }

  async update(id: string, data: ExchangeUpdateInput): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  async updateStatus(id: string, status: ExchangeStatus): Promise<void> {
    await this.update(id, { status })
  }

  async confirmByUser(id: string, userId: string, role: 'owner' | 'requester'): Promise<void> {
    const field = role === 'owner' ? 'ownerConfirmed' : 'requesterConfirmed'
    await this.update(id, { [field]: true } as ExchangeUpdateInput)
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    await deleteDoc(docRef)
  }
}

// ============ Factory ============

export function createExchangeRepository(): IExchangeRepository {
  return new FirestoreExchangeRepository()
}
