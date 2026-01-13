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
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

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
 * Verify Firebase ID token from request
 * @param token - Firebase ID token from Authorization header
 * @returns Decoded token with user info, or null if invalid
 */
export async function verifyIdToken(token: string, checkStatus: boolean = false) {
  try {
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)

    if (checkStatus) {
      const db = getAdminDb()
      const userDoc = await db.collection("users").doc(decodedToken.uid).get()
      
      if (!userDoc.exists) {
        console.warn(`[Auth] User ${decodedToken.uid} verified but has no profile (Ghost Account?)`)
        return null // or throw specific error
      }
      
      const userData = userDoc.data()
      if (userData?.status !== 'ACTIVE' && userData?.status !== 'WARNING') {
         console.warn(`[Auth] User ${decodedToken.uid} verified but status is ${userData?.status}`)
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
