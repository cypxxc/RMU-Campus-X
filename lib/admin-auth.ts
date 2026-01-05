/**
 * Admin Authentication Utilities
 * Functions for verifying admin access and permissions
 */

import { collection, query, where, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'

/**
 * Admin permissions by role
 */
export const ADMIN_PERMISSIONS = {
  super_admin: ['*'], // All permissions
  admin: [
    'users:read',
    'users:update',
    'users:suspend',
    'users:ban',
    'items:read',
    'items:update',
    'items:delete',
    'items:approve',
    'reports:read',
    'reports:resolve',
    'settings:read',
    'settings:update',
  ],
  moderator: [
    'users:read',
    'items:read',
    'items:approve',
    'reports:read',
    'reports:resolve',
  ],
} as const

export type AdminRole = keyof typeof ADMIN_PERMISSIONS
export type Permission = typeof ADMIN_PERMISSIONS[AdminRole][number]

/**
 * Check if user is an admin
 */
export async function isAdmin(email: string): Promise<boolean> {
  try {
    const db = getFirebaseDb()
    const adminsRef = collection(db, 'admins')
    const q = query(adminsRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    
    return !snapshot.empty
  } catch (error) {
    console.error('[Admin Auth] Error checking admin status:', error)
    return false
  }
}

/**
 * Get admin role
 */
export async function getAdminRole(email: string): Promise<AdminRole | null> {
  try {
    const db = getFirebaseDb()
    const adminsRef = collection(db, 'admins')
    const q = query(adminsRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    const adminDoc = snapshot.docs[0]
    if (!adminDoc) return null
    const role = adminDoc.data().role as AdminRole
    
    return role || 'moderator'
  } catch (error) {
    console.error('[Admin Auth] Error getting admin role:', error)
    return null
  }
}

/**
 * Check if admin has specific permission
 */
export async function hasPermission(
  email: string,
  permission: string
): Promise<boolean> {
  try {
    const role = await getAdminRole(email)
    if (!role) return false
    
    const permissions = ADMIN_PERMISSIONS[role] as readonly string[]
    return permissions.includes('*') || permissions.includes(permission)
  } catch (error) {
    console.error('[Admin Auth] Error checking permission:', error)
    return false
  }
}

/**
 * Get admin info
 */
export async function getAdminInfo(email: string) {
  try {
    const db = getFirebaseDb()
    const adminsRef = collection(db, 'admins')
    const q = query(adminsRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    const adminDoc = snapshot.docs[0]
    if (!adminDoc) return null
    return {
      id: adminDoc.id,
      ...adminDoc.data(),
    }
  } catch (error) {
    console.error('[Admin Auth] Error getting admin info:', error)
    return null
  }
}

/**
 * Verify admin access with role
 */
export async function verifyAdminWithRole(email: string) {
  const isAdminUser = await isAdmin(email)
  if (!isAdminUser) {
    return { authorized: false, role: null }
  }
  
  const role = await getAdminRole(email)
  return { authorized: true, role }
}
