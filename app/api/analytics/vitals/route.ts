/**
 * GET /api/analytics/vitals
 * Returns system vitals and performance metrics for analytics dashboard
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const revalidate = 300 // Cache for 5 minutes

interface VitalsData {
  timestamp: string
  users: {
    total: number
    active: number
    newThisMonth: number
  }
  items: {
    total: number
    active: number
    categories: Record<string, number>
  }
  exchanges: {
    total: number
    completed: number
    pending: number
    thisMonth: number
  }
  system: {
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    responseTime: number
  }
}

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now()
    const db = getAdminDb()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get user statistics
    const usersSnapshot = await db.collection("users").get()
    const totalUsers = usersSnapshot.size
    
    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const activeUsersSnapshot = await db
      .collection("users")
      .where("lastLoginAt", ">", thirtyDaysAgo)
      .get()
    const activeUsers = activeUsersSnapshot.size

    // Get new users this month
    const newUsersSnapshot = await db
      .collection("users")
      .where("createdAt", ">=", startOfMonth)
      .get()
    const newUsersThisMonth = newUsersSnapshot.size

    // Get item statistics
    const itemsSnapshot = await db.collection("items").get()
    const totalItems = itemsSnapshot.size
    
    // Get active items (not deleted)
    const activeItemsSnapshot = await db
      .collection("items")
      .where("status", "==", "available")
      .get()
    const activeItems = activeItemsSnapshot.size

    // Get items by category
    const categoryStats: Record<string, number> = {}
    itemsSnapshot.forEach(doc => {
      const category = doc.data().category || "other"
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })

    // Get exchange statistics
    const exchangesSnapshot = await db.collection("exchanges").get()
    const totalExchanges = exchangesSnapshot.size
    
    const completedExchangesSnapshot = await db
      .collection("exchanges")
      .where("status", "==", "completed")
      .get()
    const completedExchanges = completedExchangesSnapshot.size

    const pendingExchangesSnapshot = await db
      .collection("exchanges")
      .where("status", "in", ["pending", "in_progress"])
      .get()
    const pendingExchanges = pendingExchangesSnapshot.size

    // Get exchanges this month
    const exchangesThisMonthSnapshot = await db
      .collection("exchanges")
      .where("createdAt", ">=", startOfMonth)
      .get()
    const exchangesThisMonth = exchangesThisMonthSnapshot.size

    // Get system vitals
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    const responseTime = Date.now() - startTime

    const vitals: VitalsData = {
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
      },
      items: {
        total: totalItems,
        active: activeItems,
        categories: categoryStats,
      },
      exchanges: {
        total: totalExchanges,
        completed: completedExchanges,
        pending: pendingExchanges,
        thisMonth: exchangesThisMonth,
      },
      system: {
        uptime,
        memoryUsage,
        responseTime,
      },
    }

    return NextResponse.json({
      success: true,
      data: vitals,
    })

  } catch (error) {
    console.error("[Analytics Vitals API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics vitals",
      },
      { status: 500 }
    )
  }
}
