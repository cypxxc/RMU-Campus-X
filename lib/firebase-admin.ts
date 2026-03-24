/**
 * Firebase Admin SDK Configuration
 * Server-side only - for API routes and server operations
 * 
 * SETUP REQUIRED:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Add these to your .env file:
 *    FIREBASE_ADMIN_PROJECT_ID=your_project_id
 *    FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
 *    FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */
import { createHash } from 'crypto'
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth'
import { upstashCache } from '@/lib/upstash-cache'

class FirebaseAdminService {
  private adminApp: App | null = null
  private adminDb: Firestore | null = null
  private adminAuth: Auth | null = null
  /**
   * Two-tier cache for serverless:
   * L1 = in-memory Map (fast, but lost on cold start)
   * L2 = Upstash Redis (survives cold starts, shared across instances)
   */
  private readonly USER_STATUS_CACHE_TTL_MS = 30_000
  private readonly userStatusL1 = new Map<string, { status: string; at: number }>()
  private readonly TOKEN_CACHE_TTL_MS = 60_000
  private readonly tokenL1 = new Map<string, { decoded: DecodedIdToken; at: number }>()

  /**
   * Initialize Firebase Admin SDK
   */
  initAdminApp(): App {
    if (!this.adminApp) {
      // Check if already initialized
      const existingApps = getApps()
      if (existingApps.length > 0) {
        this.adminApp = existingApps[0]!
      } else {
        // Initialize with service account credentials
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Firebase Admin SDK credentials not found. ' +
            'Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env'
          )
        }

        // Sanity check key format
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          console.error('FIREBASE_ADMIN_PRIVATE_KEY is missing standard header. Check .env formatting.')
        }
        if (privateKey.length < 100) {
          console.error('FIREBASE_ADMIN_PRIVATE_KEY is suspiciously short.')
        }

        this.adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      }
    }
    return this.adminApp
  }

  /**
   * Get Firestore Admin instance (for server-side operations)
   * Use this in API routes instead of client-side getFirebaseDb()
   */
  getAdminDb(): Firestore {
    if (!this.adminDb) {
      this.adminDb = getFirestore(this.initAdminApp())
    }
    return this.adminDb
  }

  /**
   * Get Auth Admin instance (for server-side auth operations)
   * Use for: verifying tokens, managing users, etc.
   */
  getAdminAuth(): Auth {
    if (!this.adminAuth) {
      this.adminAuth = getAuth(this.initAdminApp())
    }
    return this.adminAuth
  }

  private getCachedUserStatusL1(uid: string): string | null {
    const entry = this.userStatusL1.get(uid)
    if (!entry) return null
    if (Date.now() - entry.at > this.USER_STATUS_CACHE_TTL_MS) {
      this.userStatusL1.delete(uid)
      return null
    }
    return entry.status
  }

  private async getCachedUserStatus(uid: string): Promise<string | null> {
    // L1 check
    const l1 = this.getCachedUserStatusL1(uid)
    if (l1 !== null) return l1

    // L2 check (Redis)
    const l2 = await upstashCache.get<string>(`user-status:${uid}`)
    if (l2 !== null) {
      // Backfill L1
      this.userStatusL1.set(uid, { status: l2, at: Date.now() })
      return l2
    }

    return null
  }

  private async setCachedUserStatus(uid: string, status: string): Promise<void> {
    // Write to both tiers
    this.userStatusL1.set(uid, { status, at: Date.now() })
    if (this.userStatusL1.size > 500) {
      const oldestKey = this.userStatusL1.keys().next().value as string | undefined
      if (oldestKey) this.userStatusL1.delete(oldestKey)
    }
    await upstashCache.set(`user-status:${uid}`, status, this.USER_STATUS_CACHE_TTL_MS)
  }

  private isDecodedTokenExpired(decoded: DecodedIdToken): boolean {
    return decoded.exp * 1000 <= Date.now() + 1000
  }

  private getCachedDecodedTokenL1(token: string): DecodedIdToken | null {
    const entry = this.tokenL1.get(token)
    if (!entry) return null
    if (Date.now() - entry.at > this.TOKEN_CACHE_TTL_MS || this.isDecodedTokenExpired(entry.decoded)) {
      this.tokenL1.delete(token)
      return null
    }
    return entry.decoded
  }

  /** Hash token for safe use as cache key (avoids collision from slice) */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex').slice(0, 32)
  }

  private async getCachedDecodedToken(token: string): Promise<DecodedIdToken | null> {
    // L1 check
    const l1 = this.getCachedDecodedTokenL1(token)
    if (l1 !== null) return l1

    // L2 check (Redis) — use SHA-256 hash to avoid storing full tokens and prevent collision
    const tokenKey = `token:${this.hashToken(token)}`
    const l2 = await upstashCache.get<DecodedIdToken>(tokenKey)
    if (l2 !== null && !this.isDecodedTokenExpired(l2)) {
      // Backfill L1
      this.tokenL1.set(token, { decoded: l2, at: Date.now() })
      return l2
    }

    return null
  }

  private async setCachedDecodedToken(token: string, decoded: DecodedIdToken): Promise<void> {
    if (this.isDecodedTokenExpired(decoded)) return

    // Write to both tiers
    this.tokenL1.set(token, { decoded, at: Date.now() })
    if (this.tokenL1.size > 500) {
      const oldestKey = this.tokenL1.keys().next().value as string | undefined
      if (oldestKey) this.tokenL1.delete(oldestKey)
    }

    const tokenKey = `token:${this.hashToken(token)}`
    await upstashCache.set(tokenKey, decoded, this.TOKEN_CACHE_TTL_MS)
  }

  /**
   * Verify Firebase ID token from request
   * @param token - Firebase ID token from Authorization header
   * @returns Decoded token with user info, or null if invalid
   */
  async verifyIdToken(token: string, checkStatus: boolean = false) {
    try {
      const auth = this.getAdminAuth()
      const cachedDecoded = await this.getCachedDecodedToken(token)
      const decodedToken = cachedDecoded ?? await auth.verifyIdToken(token)
      if (!cachedDecoded) await this.setCachedDecodedToken(token, decodedToken)

      if (checkStatus) {
        const uid = decodedToken.uid
        const cached = await this.getCachedUserStatus(uid)
        if (cached !== null) {
          if (cached !== 'ACTIVE' && cached !== 'WARNING') return null
          return decodedToken
        }

        const db = this.getAdminDb()
        const userDoc = await db.collection('users').doc(uid).get()

        if (!userDoc.exists) {
          console.warn(`[Auth] User ${uid} verified but has no profile (Ghost Account?)`)
          return null
        }

        const userData = userDoc.data()
        const status = (userData?.status as string) ?? ''
        await this.setCachedUserStatus(uid, status)

        if (status !== 'ACTIVE' && status !== 'WARNING') {
          console.warn(`[Auth] User ${uid} verified but status is ${status}`)
          return null
        }
      }

      return decodedToken
    } catch (error) {
      console.error('[Firebase Admin] Token verification failed:', error)
      return null
    }
  }

  /**
   * Get user doc from Firestore (server-side).
   * Use to check termsAccepted, restrictions, etc.
   */
  async getAdminUserDoc(uid: string) {
    const db = this.getAdminDb()
    const snap = await db.collection('users').doc(uid).get()
    return snap.exists ? snap.data() : null
  }

  /**
   * Check if user has accepted terms. Returns false if no doc or termsAccepted !== true.
   */
  async hasAcceptedTerms(uid: string): Promise<boolean> {
    const data = await this.getAdminUserDoc(uid)
    return data?.termsAccepted === true
  }

  /**
   * Check if user is allowed to create exchanges (status + restrictions.canExchange).
   */
  async canUserExchange(uid: string): Promise<boolean> {
    const data = await this.getAdminUserDoc(uid)
    if (!data) return false
    const status = data.status
    if (status !== 'ACTIVE' && status !== 'WARNING') return false
    const restrictions = data.restrictions
    if (restrictions && restrictions.canExchange === false) return false
    return true
  }

  /**
   * Check if user is allowed to post items (status + restrictions.canPost).
   */
  async canUserPost(uid: string): Promise<boolean> {
    const data = await this.getAdminUserDoc(uid)
    if (!data) return false
    const status = data.status
    if (status !== 'ACTIVE' && status !== 'WARNING') return false
    const restrictions = data.restrictions
    if (restrictions && restrictions.canPost === false) return false
    return true
  }

  /**
   * Debug version that throws errors instead of returning null
   */
  async verifyIdTokenDebug(token: string) {
    try {
      const auth = this.getAdminAuth()
      return await auth.verifyIdToken(token)
    } catch (error) {
      console.error('[Firebase Admin Debug] Token verification failed:', error)
      throw error // Rethrow to let caller handle/display it
    }
  }
}

const firebaseAdminService = new FirebaseAdminService()

/**
 * Get Firestore Admin instance (for server-side operations)
 * Use this in API routes instead of client-side getFirebaseDb()
 */
export function getAdminDb(): Firestore {
  return firebaseAdminService.getAdminDb()
}

/**
 * Get Auth Admin instance (for server-side auth operations)
 * Use for: verifying tokens, managing users, etc.
 */
export function getAdminAuth(): Auth {
  return firebaseAdminService.getAdminAuth()
}

/**
 * Verify Firebase ID token from request
 * @param token - Firebase ID token from Authorization header
 * @returns Decoded token with user info, or null if invalid
 */
export async function verifyIdToken(token: string, checkStatus: boolean = false) {
  return firebaseAdminService.verifyIdToken(token, checkStatus)
}

/**
 * Get user doc from Firestore (server-side).
 * Use to check termsAccepted, restrictions, etc.
 */
export async function getAdminUserDoc(uid: string) {
  return firebaseAdminService.getAdminUserDoc(uid)
}

/**
 * Check if user has accepted terms. Returns false if no doc or termsAccepted !== true.
 */
export async function hasAcceptedTerms(uid: string): Promise<boolean> {
  return firebaseAdminService.hasAcceptedTerms(uid)
}

/**
 * Check if user is allowed to create exchanges (status + restrictions.canExchange).
 */
export async function canUserExchange(uid: string): Promise<boolean> {
  return firebaseAdminService.canUserExchange(uid)
}

/**
 * Check if user is allowed to post items (status + restrictions.canPost).
 */
export async function canUserPost(uid: string): Promise<boolean> {
  return firebaseAdminService.canUserPost(uid)
}

/**
 * Debug version that throws errors instead of returning null
 */
export async function verifyIdTokenDebug(token: string) {
  return firebaseAdminService.verifyIdTokenDebug(token)
}

/**
 * Extract token from Authorization header
 * @param authHeader - "Bearer <token>" format
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
