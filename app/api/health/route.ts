/**
 * Health Check API Endpoint
 * Used by monitoring tools to verify system availability
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { getNotificationDeliveryHealth } from '@/lib/server/notification-delivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    name: string
    status: 'pass' | 'fail'
    latency?: number
    message?: string
  }[]
}

const startTime = Date.now()

class HealthController {
  async get() {
    const checks: HealthStatus['checks'] = []
    let overallStatus: HealthStatus['status'] = 'healthy'

    // Check 1: Firestore connectivity
    try {
      const firestoreStart = Date.now()
      const db = getAdminDb()
      // Simple ping query
      await db.collection('_health').limit(1).get()
      checks.push({
        name: 'firestore',
        status: 'pass',
        latency: Date.now() - firestoreStart,
      })
    } catch (error) {
      checks.push({
        name: 'firestore',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Connection failed',
      })
      overallStatus = 'unhealthy'
    }

    // Check 2: Environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'CLOUDINARY_CLOUD_NAME',
    ]

    const missingEnvVars = requiredEnvVars.filter(
      (v) => !process.env[v]
    )

    if (missingEnvVars.length > 0) {
      checks.push({
        name: 'environment',
        status: 'fail',
        message: `Missing: ${missingEnvVars.join(', ')}`,
      })
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
    } else {
      checks.push({
        name: 'environment',
        status: 'pass',
      })
    }

    // Check 3: Memory usage
    const memoryUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)

    checks.push({
      name: 'memory',
      status: memoryPercent > 90 ? 'fail' : 'pass',
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${memoryPercent}%)`,
    })

    if (memoryPercent > 90) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
    }

    // Check 4: Notification delivery queue health
    try {
      const notificationStart = Date.now()
      const notificationHealth = await getNotificationDeliveryHealth()
      const notificationLatency = Date.now() - notificationStart

      checks.push({
        name: 'notification_delivery',
        status: notificationHealth.status === 'healthy' ? 'pass' : 'fail',
        latency: notificationLatency,
        message:
          `pending=${notificationHealth.stats.pendingQueue}, stale=${notificationHealth.stats.stalePending}, dead=${notificationHealth.stats.deadLetter}` +
          (notificationHealth.reasons.length ? ` (${notificationHealth.reasons.join('; ')})` : ''),
      })

      if (notificationHealth.status !== 'healthy') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    } catch (error) {
      checks.push({
        name: 'notification_delivery',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Notification delivery health check failed',
      })
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
    }

    const response: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      checks,
    }

    const statusCode = overallStatus === 'healthy' ? 200 :
                       overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(response, { status: statusCode })
  }
}

const controller = new HealthController()

export async function GET() {
  return controller.get()
}
