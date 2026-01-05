/**
 * Admin Stats API
 * GET /api/admin/stats
 */

import { NextRequest } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const db = getFirebaseDb()
    
    // Get current date ranges
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

    // Fetch all collections
    const [usersSnap, itemsSnap, reportsSnap, exchangesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'items')),
      getDocs(collection(db, 'reports')),
      getDocs(collection(db, 'exchanges')),
    ])

    // Calculate user stats
    const totalUsers = usersSnap.size
    const activeUsers = usersSnap.docs.filter(doc => doc.data().status === 'ACTIVE').length
    const suspendedUsers = usersSnap.docs.filter(doc => doc.data().status === 'SUSPENDED').length
    const bannedUsers = usersSnap.docs.filter(doc => doc.data().status === 'BANNED').length

    // Users this month vs last month
    const usersThisMonth = usersSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= lastMonth
    }).length
    
    const usersLastMonth = usersSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= twoMonthsAgo && createdAt < lastMonth
    }).length

    const userGrowth = usersLastMonth > 0 
      ? ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1)
      : '0'

    // Calculate item stats
    const totalItems = itemsSnap.size
    const activeItems = itemsSnap.docs.filter(doc => doc.data().status === 'available').length
    const completedItems = itemsSnap.docs.filter(doc => doc.data().status === 'completed').length

    const itemsThisMonth = itemsSnap.docs.filter(doc => {
      const postedAt = doc.data().postedAt?.toDate?.() || new Date(0)
      return postedAt >= lastMonth
    }).length

    const itemsLastMonth = itemsSnap.docs.filter(doc => {
      const postedAt = doc.data().postedAt?.toDate?.() || new Date(0)
      return postedAt >= twoMonthsAgo && postedAt < lastMonth
    }).length

    const itemGrowth = itemsLastMonth > 0
      ? ((itemsThisMonth - itemsLastMonth) / itemsLastMonth * 100).toFixed(1)
      : '0'

    // Calculate report stats
    const totalReports = reportsSnap.size
    const pendingReports = reportsSnap.docs.filter(doc => doc.data().status === 'new').length
    const resolvedReports = reportsSnap.docs.filter(doc => doc.data().status === 'resolved').length

    // Calculate exchange stats
    const totalExchanges = exchangesSnap.size
    const completedExchanges = exchangesSnap.docs.filter(doc => doc.data().status === 'completed').length
    const exchangeRate = totalExchanges > 0
      ? ((completedExchanges / totalExchanges) * 100).toFixed(1)
      : '0'

    const exchangesThisMonth = exchangesSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= lastMonth
    }).length

    const exchangesLastMonth = exchangesSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= twoMonthsAgo && createdAt < lastMonth
    }).length

    const exchangeGrowth = exchangesLastMonth > 0
      ? ((exchangesThisMonth - exchangesLastMonth) / exchangesLastMonth * 100).toFixed(1)
      : '0'

    return successResponse({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        growth: `${userGrowth}%`,
        trend: parseFloat(userGrowth) >= 0 ? 'up' : 'down',
      },
      items: {
        total: totalItems,
        active: activeItems,
        completed: completedItems,
        growth: `${itemGrowth}%`,
        trend: parseFloat(itemGrowth) >= 0 ? 'up' : 'down',
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
      },
      exchanges: {
        total: totalExchanges,
        completed: completedExchanges,
        rate: `${exchangeRate}%`,
        growth: `${exchangeGrowth}%`,
        trend: parseFloat(exchangeGrowth) >= 0 ? 'up' : 'down',
      },
    })
  } catch (error) {
    console.error('[Admin API] Error fetching stats:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch statistics',
      500
    )
  }
}
