// ============================================================
// User Repository - Abstraction over Firestore
// ============================================================

import type { User, UserStatus } from "@/types"
import type { IRepository } from "./types"

// ============ Types ============

export interface UserUpdateInput {
  displayName?: string
  bio?: string
  photoURL?: string
  status?: UserStatus
  warningCount?: number
  suspendedUntil?: Date | null
  bannedReason?: string | null
  restrictions?: {
    canPost: boolean
    canExchange: boolean
    canChat: boolean
  }
  lineUserId?: string
  lineNotifications?: {
    enabled: boolean
    exchangeRequest: boolean
    exchangeStatus: boolean
    exchangeComplete: boolean
  }
}

export interface IUserRepository extends IRepository<User, Partial<User>, UserUpdateInput> {
  findByEmail(email: string): Promise<User | null>
  findAdmins(): Promise<User[]>
  updateStatus(id: string, status: UserStatus): Promise<void>
  incrementWarningCount(id: string): Promise<number>
}

// ============ Firestore Implementation ============

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

export class FirestoreUserRepository implements IUserRepository {
  private collectionName = "users"

  private getCollection() {
    return collection(getFirebaseDb(), this.collectionName)
  }

  async findById(id: string): Promise<User | null> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { uid: docSnap.id, ...docSnap.data() } as User
  }

  async findByEmail(email: string): Promise<User | null> {
    const q = query(this.getCollection(), where("email", "==", email))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { uid: doc.id, ...doc.data() } as User
  }

  async findAll(): Promise<User[]> {
    const snapshot = await getDocs(this.getCollection())
    return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as User)
  }

  async findAdmins(): Promise<User[]> {
    const q = query(this.getCollection(), where("isAdmin", "==", true))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as User)
  }

  async create(data: Partial<User>): Promise<User> {
    if (!data.uid) throw new Error("User UID is required")
    const docRef = doc(getFirebaseDb(), this.collectionName, data.uid)
    await setDoc(docRef, {
      ...data,
      status: data.status || "ACTIVE",
      warningCount: 0,
      createdAt: serverTimestamp(),
    })
    const created = await this.findById(data.uid)
    if (!created) throw new Error("Failed to create user")
    return created
  }

  async update(id: string, data: UserUpdateInput): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  async updateStatus(id: string, status: UserStatus): Promise<void> {
    await this.update(id, { status })
  }

  async incrementWarningCount(id: string): Promise<number> {
    const user = await this.findById(id)
    if (!user) throw new Error(`User ${id} not found`)
    const newCount = (user.warningCount || 0) + 1
    await this.update(id, { warningCount: newCount })
    return newCount
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(getFirebaseDb(), this.collectionName, id)
    await deleteDoc(docRef)
  }
}

// ============ Factory ============

export function createUserRepository(): IUserRepository {
  return new FirestoreUserRepository()
}
