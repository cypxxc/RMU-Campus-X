/**
 * Session Management Utilities
 * Track and manage user sessions across devices
 */

import { getFirebaseDb } from '@/lib/firebase'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'

export interface UserSession {
  id: string
  userId: string
  deviceInfo: {
    userAgent: string
    platform: string
    browser: string
    isMobile: boolean
  }
  ip: string
  location?: string
  createdAt: Date
  lastActiveAt: Date
  isCurrentSession?: boolean
}

/**
 * Parse user agent to extract device info
 */
function parseUserAgent(userAgent: string): UserSession['deviceInfo'] {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
  
  let browser = 'Unknown'
  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'
  
  let platform = 'Unknown'
  if (userAgent.includes('Windows')) platform = 'Windows'
  else if (userAgent.includes('Mac')) platform = 'macOS'
  else if (userAgent.includes('Linux')) platform = 'Linux'
  else if (userAgent.includes('Android')) platform = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS'

  return {
    userAgent,
    platform,
    browser,
    isMobile,
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  userAgent: string,
  ip: string
): Promise<string> {
  const db = getFirebaseDb()
  const sessionId = generateSessionId()
  
  const sessionData = {
    userId,
    deviceInfo: parseUserAgent(userAgent),
    ip,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'userSessions', sessionId), sessionData)
  
  return sessionId
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = getFirebaseDb()
  
  await setDoc(
    doc(db, 'userSessions', sessionId),
    { lastActiveAt: serverTimestamp() },
    { merge: true }
  )
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<UserSession[]> {
  const db = getFirebaseDb()
  
  const sessionsQuery = query(
    collection(db, 'userSessions'),
    where('userId', '==', userId),
    orderBy('lastActiveAt', 'desc'),
    limit(10)
  )

  const snapshot = await getDocs(sessionsQuery)
  
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      userId: data.userId,
      deviceInfo: data.deviceInfo,
      ip: data.ip,
      location: data.location,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      lastActiveAt: (data.lastActiveAt as Timestamp)?.toDate() || new Date(),
      isCurrentSession: doc.id === currentSessionId,
    }
  })
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, 'userSessions', sessionId))
}

/**
 * Revoke all sessions for a user except current
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  const db = getFirebaseDb()
  
  const sessionsQuery = query(
    collection(db, 'userSessions'),
    where('userId', '==', userId)
  )

  const snapshot = await getDocs(sessionsQuery)
  let revoked = 0

  for (const sessionDoc of snapshot.docs) {
    if (sessionDoc.id !== currentSessionId) {
      await deleteDoc(sessionDoc.ref)
      revoked++
    }
  }

  return revoked
}

/**
 * Clean up old sessions (older than 30 days)
 */
export async function cleanupOldSessions(): Promise<number> {
  const db = getFirebaseDb()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const oldSessionsQuery = query(
    collection(db, 'userSessions'),
    where('lastActiveAt', '<', Timestamp.fromDate(thirtyDaysAgo)),
    limit(100)
  )

  const snapshot = await getDocs(oldSessionsQuery)
  let cleaned = 0

  for (const sessionDoc of snapshot.docs) {
    await deleteDoc(sessionDoc.ref)
    cleaned++
  }

  return cleaned
}
