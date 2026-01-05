/**
 * Admin Middleware - Protect admin routes
 * Place this in middleware.ts or use in admin layout
 * 
 * NOTE: This middleware is currently not active. 
 * Admin protection is handled by individual page components checking admin status.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'

/**
 * Check if user has admin role
 */
export async function checkAdminRole(email: string): Promise<boolean> {
  try {
    const db = getFirebaseDb()
    const adminsRef = collection(db, 'admins')
    const q = query(adminsRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    
    return !snapshot.empty
  } catch (error) {
    console.error('[AdminMiddleware] Error checking admin role:', error)
    return false
  }
}

/**
 * Admin middleware function (for use with NextAuth or similar)
 * Currently not active - admin checking is done in page components
 */
export async function adminMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if accessing admin routes
  if (pathname.startsWith('/admin')) {
    // Note: Session checking requires NextAuth or similar setup
    // For now, admin protection is handled by page components
    // which check Firebase auth and admin collection directly
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
