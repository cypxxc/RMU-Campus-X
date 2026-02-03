/**
 * Admin Stats API
 * GET /api/admin/stats
 * 
 * OPTIMIZED: Uses count aggregations and limited queries instead of fetching all documents
 */

import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
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
    const db = getAdminDb()
    
    // Get current date ranges
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

    // Use Promise.all for parallel count queries (much faster than fetching all docs)
    const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000))

    const [
      // User counts
      totalUsersCount,
      activeUsersCount,
      suspendedUsersCount,
      bannedUsersCount,
      // Item counts
      totalItemsCount,
      activeItemsCount,
      pendingItemsCount,
      completedItemsCount,
      newItemsLast24hCount,
      // Report counts
      totalReportsCount,
      pendingReportsCount,
      resolvedReportsCount,
      // Exchange counts
      totalExchangesCount,
      completedExchangesCount,
    ] = await Promise.all([
      // Users
      db.collection('users').count().get().then(s => s.data().count),
      db.collection('users').where('status', '==', 'ACTIVE').count().get().then(s => s.data().count),
      db.collection('users').where('status', '==', 'SUSPENDED').count().get().then(s => s.data().count),
      db.collection('users').where('status', '==', 'BANNED').count().get().then(s => s.data().count),
      // Items
      db.collection('items').count().get().then(s => s.data().count),
      db.collection('items').where('status', '==', 'available').count().get().then(s => s.data().count),
      db.collection('items').where('status', '==', 'pending').count().get().then(s => s.data().count),
      db.collection('items').where('status', '==', 'completed').count().get().then(s => s.data().count),
      db.collection('items').where('postedAt', '>=', twentyFourHoursAgo).count().get().then(s => s.data().count),
      // Reports
      db.collection('reports').count().get().then(s => s.data().count),
      db.collection('reports').where('status', '==', 'new').count().get().then(s => s.data().count),
      db.collection('reports').where('status', '==', 'resolved').count().get().then(s => s.data().count),
      // Exchanges
      db.collection('exchanges').count().get().then(s => s.data().count),
      db.collection('exchanges').where('status', '==', 'completed').count().get().then(s => s.data().count),
    ])

    // For growth calculations, fetch limited recent documents only
    const [usersRecent, itemsRecent, exchangesRecent] = await Promise.all([
      db.collection('users').orderBy('createdAt', 'desc').limit(200).get(),
      db.collection('items').orderBy('postedAt', 'desc').limit(200).get(),
      db.collection('exchanges').orderBy('createdAt', 'desc').limit(200).get(),
    ])

    // Calculate growth from limited sample
    const usersThisMonth = usersRecent.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= lastMonth
    }).length
    
    const usersLastMonth = usersRecent.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= twoMonthsAgo && createdAt < lastMonth
    }).length

    const userGrowth = usersLastMonth > 0 
      ? ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1)
      : '0'

    const itemsThisMonth = itemsRecent.docs.filter(doc => {
      const postedAt = doc.data().postedAt?.toDate?.() || new Date(0)
      return postedAt >= lastMonth
    }).length

    const itemsLastMonth = itemsRecent.docs.filter(doc => {
      const postedAt = doc.data().postedAt?.toDate?.() || new Date(0)
      return postedAt >= twoMonthsAgo && postedAt < lastMonth
    }).length

    const itemGrowth = itemsLastMonth > 0
      ? ((itemsThisMonth - itemsLastMonth) / itemsLastMonth * 100).toFixed(1)
      : '0'

    const exchangeRate = totalExchangesCount > 0
      ? ((completedExchangesCount / totalExchangesCount) * 100).toFixed(1)
      : '0'

    const exchangesThisMonth = exchangesRecent.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= lastMonth
    }).length

    const exchangesLastMonth = exchangesRecent.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(0)
      return createdAt >= twoMonthsAgo && createdAt < lastMonth
    }).length

    const exchangeGrowth = exchangesLastMonth > 0
      ? ((exchangesThisMonth - exchangesLastMonth) / exchangesLastMonth * 100).toFixed(1)
      : '0'

    return successResponse({
      users: {
        total: totalUsersCount,
        active: activeUsersCount,
        suspended: suspendedUsersCount,
        banned: bannedUsersCount,
        growth: `${userGrowth}%`,
        trend: parseFloat(userGrowth) >= 0 ? 'up' : 'down',
      },
      items: {
        total: totalItemsCount,
        active: activeItemsCount,
        pending: pendingItemsCount,
        completed: completedItemsCount,
        newLast24h: newItemsLast24hCount,
        growth: `${itemGrowth}%`,
        trend: parseFloat(itemGrowth) >= 0 ? 'up' : 'down',
      },
      reports: {
        total: totalReportsCount,
        pending: pendingReportsCount,
        resolved: resolvedReportsCount,
      },
      exchanges: {
        total: totalExchangesCount,
        completed: completedExchangesCount,
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
