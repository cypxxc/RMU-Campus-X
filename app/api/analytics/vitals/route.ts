/**
 * GET /api/analytics/vitals
 * Returns system vitals and performance metrics for analytics dashboard
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { getNotificationDeliveryStats } from "@/lib/server/notification-delivery"

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
  notifications: {
    pendingQueue: number
    stalePending: number
    deadLetter: number
    processedLastHour: number
    deliveredLastHour: number
    queuedLastHour: number
    retriedLastHour: number
    deadLetterLastHour: number
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const categoryValues = ["electronics", "books", "furniture", "clothing", "sports", "other"] as const

    const categoryCountPromises = categoryValues.map((category) =>
      db
        .collection("items")
        .where("category", "==", category)
        .count()
        .get()
        .then((snapshot) => [category, snapshot.data().count] as const)
    )

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalItems,
      activeItems,
      totalExchanges,
      completedExchanges,
      pendingExchanges,
      exchangesThisMonth,
      categoryEntries,
      notificationStats,
    ] = await Promise.all([
      db.collection("users").count().get().then((snapshot) => snapshot.data().count),
      db.collection("users").where("lastLoginAt", ">", thirtyDaysAgo).count().get().then((snapshot) => snapshot.data().count),
      db.collection("users").where("createdAt", ">=", startOfMonth).count().get().then((snapshot) => snapshot.data().count),
      db.collection("items").count().get().then((snapshot) => snapshot.data().count),
      db.collection("items").where("status", "==", "available").count().get().then((snapshot) => snapshot.data().count),
      db.collection("exchanges").count().get().then((snapshot) => snapshot.data().count),
      db.collection("exchanges").where("status", "==", "completed").count().get().then((snapshot) => snapshot.data().count),
      db.collection("exchanges").where("status", "in", ["pending", "in_progress"]).count().get().then((snapshot) => snapshot.data().count),
      db.collection("exchanges").where("createdAt", ">=", startOfMonth).count().get().then((snapshot) => snapshot.data().count),
      Promise.all(categoryCountPromises),
      getNotificationDeliveryStats(db),
    ])

    const categoryStats: Record<string, number> = {}
    for (const [category, count] of categoryEntries) {
      if (count > 0) categoryStats[category] = count
    }

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
      notifications: {
        pendingQueue: notificationStats.pendingQueue,
        stalePending: notificationStats.stalePending,
        deadLetter: notificationStats.deadLetter,
        processedLastHour: notificationStats.processedLastHour,
        deliveredLastHour: notificationStats.deliveredLastHour,
        queuedLastHour: notificationStats.queuedLastHour,
        retriedLastHour: notificationStats.retriedLastHour,
        deadLetterLastHour: notificationStats.deadLetterLastHour,
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
