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

let adminApp: App | null = null
let adminDb: Firestore | null = null
let adminAuth: Auth | null = null

/**
 * Initialize Firebase Admin SDK
 */
function initAdminApp(): App {
  if (!adminApp) {
    // Check if already initialized
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]!
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

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    }
  }
  return adminApp
}

/**
 * Get Firestore Admin instance (for server-side operations)
 * Use this in API routes instead of client-side getFirebaseDb()
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(initAdminApp())
  }
  return adminDb
}

/**
 * Get Auth Admin instance (for server-side auth operations)
 * Use for: verifying tokens, managing users, etc.
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(initAdminApp())
  }
  return adminAuth
}

/**
 * Two-tier cache for serverless:
 * L1 = in-memory Map (fast, but lost on cold start)
 * L2 = Upstash Redis (survives cold starts, shared across instances)
 */
const USER_STATUS_CACHE_TTL_MS = 30_000
const userStatusL1 = new Map<string, { status: string; at: number }>()
const TOKEN_CACHE_TTL_MS = 60_000
const tokenL1 = new Map<string, { decoded: DecodedIdToken; at: number }>()

function getCachedUserStatusL1(uid: string): string | null {
  const entry = userStatusL1.get(uid)
  if (!entry) return null
  if (Date.now() - entry.at > USER_STATUS_CACHE_TTL_MS) {
    userStatusL1.delete(uid)
    return null
  }
  return entry.status
}

async function getCachedUserStatus(uid: string): Promise<string | null> {
  // L1 check
  const l1 = getCachedUserStatusL1(uid)
  if (l1 !== null) return l1

  // L2 check (Redis)
  const l2 = await upstashCache.get<string>(`user-status:${uid}`)
  if (l2 !== null) {
    // Backfill L1
    userStatusL1.set(uid, { status: l2, at: Date.now() })
    return l2
  }

  return null
}

async function setCachedUserStatus(uid: string, status: string): Promise<void> {
  // Write to both tiers
  userStatusL1.set(uid, { status, at: Date.now() })
  if (userStatusL1.size > 500) {
    const oldestKey = userStatusL1.keys().next().value as string | undefined
    if (oldestKey) userStatusL1.delete(oldestKey)
  }
  await upstashCache.set(`user-status:${uid}`, status, USER_STATUS_CACHE_TTL_MS)
}

function isDecodedTokenExpired(decoded: DecodedIdToken): boolean {
  return decoded.exp * 1000 <= Date.now() + 1000
}

function getCachedDecodedTokenL1(token: string): DecodedIdToken | null {
  const entry = tokenL1.get(token)
  if (!entry) return null
  if (Date.now() - entry.at > TOKEN_CACHE_TTL_MS || isDecodedTokenExpired(entry.decoded)) {
    tokenL1.delete(token)
    return null
  }
  return entry.decoded
}

/** Hash token for safe use as cache key (avoids collision from slice) */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32)
}

async function getCachedDecodedToken(token: string): Promise<DecodedIdToken | null> {
  // L1 check
  const l1 = getCachedDecodedTokenL1(token)
  if (l1 !== null) return l1

  // L2 check (Redis) — use SHA-256 hash to avoid storing full tokens and prevent collision
  const tokenKey = `token:${hashToken(token)}`
  const l2 = await upstashCache.get<DecodedIdToken>(tokenKey)
  if (l2 !== null && !isDecodedTokenExpired(l2)) {
    // Backfill L1
    tokenL1.set(token, { decoded: l2, at: Date.now() })
    return l2
  }

  return null
}

async function setCachedDecodedToken(token: string, decoded: DecodedIdToken): Promise<void> {
  if (isDecodedTokenExpired(decoded)) return

  // Write to both tiers
  tokenL1.set(token, { decoded, at: Date.now() })
  if (tokenL1.size > 500) {
    const oldestKey = tokenL1.keys().next().value as string | undefined
    if (oldestKey) tokenL1.delete(oldestKey)
  }

  const tokenKey = `token:${hashToken(token)}`
  await upstashCache.set(tokenKey, decoded, TOKEN_CACHE_TTL_MS)
}

/**
 * Verify Firebase ID token from request
 * @param token - Firebase ID token from Authorization header
 * @returns Decoded token with user info, or null if invalid
 */
export async function verifyIdToken(token: string, checkStatus: boolean = false) {
  try {
    const auth = getAdminAuth()
    const cachedDecoded = await getCachedDecodedToken(token)
    const decodedToken = cachedDecoded ?? await auth.verifyIdToken(token)
    if (!cachedDecoded) await setCachedDecodedToken(token, decodedToken)

    if (checkStatus) {
      const uid = decodedToken.uid
      const cached = await getCachedUserStatus(uid)
      if (cached !== null) {
        if (cached !== "ACTIVE" && cached !== "WARNING") return null
        return decodedToken
      }

      const db = getAdminDb()
      const userDoc = await db.collection("users").doc(uid).get()

      if (!userDoc.exists) {
        console.warn(`[Auth] User ${uid} verified but has no profile (Ghost Account?)`)
        return null
      }

      const userData = userDoc.data()
      const status = (userData?.status as string) ?? ""
      await setCachedUserStatus(uid, status)

      if (status !== "ACTIVE" && status !== "WARNING") {
        console.warn(`[Auth] User ${uid} verified but status is ${status}`)
        return null
      }
    }

    return decodedToken
  } catch (error) {
    console.error("[Firebase Admin] Token verification failed:", error)
    return null
  }
}

/**
 * Get user doc from Firestore (server-side).
 * Use to check termsAccepted, restrictions, etc.
 */
export async function getAdminUserDoc(uid: string) {
  const db = getAdminDb()
  const snap = await db.collection("users").doc(uid).get()
  return snap.exists ? snap.data() : null
}

/**
 * Check if user has accepted terms. Returns false if no doc or termsAccepted !== true.
 */
export async function hasAcceptedTerms(uid: string): Promise<boolean> {
  const data = await getAdminUserDoc(uid)
  return data?.termsAccepted === true
}

/**
 * Check if user is allowed to create exchanges (status + restrictions.canExchange).
 */
export async function canUserExchange(uid: string): Promise<boolean> {
  const data = await getAdminUserDoc(uid)
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
export async function canUserPost(uid: string): Promise<boolean> {
  const data = await getAdminUserDoc(uid)
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
export async function verifyIdTokenDebug(token: string) {
  try {
    const auth = getAdminAuth()
    return await auth.verifyIdToken(token)
  } catch (error) {
    console.error('[Firebase Admin Debug] Token verification failed:', error)
    throw error // Rethrow to let caller handle/display it
  }
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
