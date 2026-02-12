/**
 * Feature Flags System
 * Enable/disable features without code deployment
 */

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string
  rolloutPercentage?: number // 0-100 for gradual rollout
  allowedUsers?: string[] // Specific user IDs that can access
  startDate?: Date
  endDate?: Date
}

// Default feature flags
const defaultFlags: Record<string, FeatureFlag> = {
  // Core Features
  'chat.enabled': {
    key: 'chat.enabled',
    enabled: true,
    description: 'Enable in-app chat',
  },
  'notifications.push': {
    key: 'notifications.push',
    enabled: true,
    description: 'Enable push notifications',
  },
  'reviews.enabled': {
    key: 'reviews.enabled',
    enabled: true,
    description: 'Enable user reviews',
  },

  // Experimental Features
  'search.fuzzy': {
    key: 'search.fuzzy',
    enabled: true,
    description: 'Enable fuzzy search matching',
  },
  'ai.chatbot': {
    key: 'ai.chatbot',
    enabled: true,
    description: 'Enable AI help chatbot',
  },
  'items.recommendations': {
    key: 'items.recommendations',
    enabled: false,
    description: 'Show personalized item recommendations',
  },

  // Beta Features
  'beta.darkMode': {
    key: 'beta.darkMode',
    enabled: true,
    description: 'Dark mode support',
  },
  'beta.animations': {
    key: 'beta.animations',
    enabled: true,
    description: 'Enable UI animations',
  },
  'beta.webPush': {
    key: 'beta.webPush',
    enabled: false,
    description: 'Web push notifications (experimental)',
  },

  // Admin Features
  'admin.bulkActions': {
    key: 'admin.bulkActions',
    enabled: true,
    description: 'Enable bulk actions in admin panel',
  },
  'admin.analytics': {
    key: 'admin.analytics',
    enabled: true,
    description: 'Show analytics dashboard',
  },

  // Maintenance
  'maintenance.mode': {
    key: 'maintenance.mode',
    enabled: false,
    description: 'Show maintenance page',
  },
  'maintenance.readOnly': {
    key: 'maintenance.readOnly',
    enabled: false,
    description: 'Disable write operations',
  },
}

// Runtime flag overrides (can be loaded from database/API)
let runtimeFlags: Record<string, Partial<FeatureFlag>> = {}

/**
 * Load flags from external source (database, API, etc.)
 */
export async function loadFlags(): Promise<void> {
  try {
    // Load from Firestore in production
    if (process.env.NODE_ENV === "production") {
      const { getAdminDb } = await import("@/lib/firebase-admin")
      const db = getAdminDb()
      const snapshot = await db.collection("featureFlags").get()
      
      runtimeFlags = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data()
        acc[doc.id] = {
          enabled: data.enabled ?? false,
          description: data.description ?? "",
          rolloutPercentage: data.rolloutPercentage,
          allowedUsers: data.allowedUsers,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        }
        return acc
      }, {} as Record<string, Partial<FeatureFlag>>)
      
      console.log(`[FeatureFlags] Loaded ${snapshot.docs.length} flags from database`)
      return
    }
  } catch (error) {
    console.warn("[FeatureFlags] Failed to load from database:", error)
  }
  
  // Fallback to environment variables
  if (process.env.FEATURE_FLAGS) {
    try {
      runtimeFlags = JSON.parse(process.env.FEATURE_FLAGS)
    } catch {
      console.warn('[FeatureFlags] Invalid FEATURE_FLAGS env var')
    }
  }
}

/**
 * Get a feature flag value
 */
export function getFlag(key: string): FeatureFlag | undefined {
  const defaultFlag = defaultFlags[key]
  const runtimeOverride = runtimeFlags[key]

  if (!defaultFlag) {
    console.warn(`[FeatureFlags] Unknown flag: ${key}`)
    return undefined
  }

  return {
    ...defaultFlag,
    ...runtimeOverride,
  }
}

/**
 * Check if a feature is enabled
 */
export function isEnabled(
  key: string,
  context?: { userId?: string; userEmail?: string }
): boolean {
  const flag = getFlag(key)
  
  if (!flag) return false
  if (!flag.enabled) return false

  const now = new Date()

  // Check date range
  if (flag.startDate && now < flag.startDate) return false
  if (flag.endDate && now > flag.endDate) return false

  // Check allowed users
  if (flag.allowedUsers && context?.userId) {
    if (!flag.allowedUsers.includes(context.userId)) {
      return false
    }
  }

  // Check rollout percentage
  if (flag.rolloutPercentage !== undefined && context?.userId) {
    const hash = simpleHash(context.userId + key)
    const userPercentage = hash % 100
    if (userPercentage >= flag.rolloutPercentage) {
      return false
    }
  }

  return true
}

/**
 * Get all flags
 */
export function getAllFlags(): Record<string, FeatureFlag> {
  const combined: Record<string, FeatureFlag> = {}

  for (const key of Object.keys(defaultFlags)) {
    const flag = getFlag(key)
    if (flag) {
      combined[key] = flag
    }
  }

  return combined
}

/**
 * Set a runtime flag override
 */
export function setFlag(key: string, value: Partial<FeatureFlag>): void {
  runtimeFlags[key] = value
}

/**
 * Simple hash function for consistent user bucketing
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// React hook for feature flags
export function useFeatureFlag(
  key: string,
  context?: { userId?: string }
): boolean {
  return isEnabled(key, context)
}

// Export flag keys as constants
export const FLAGS = {
  CHAT_ENABLED: 'chat.enabled',
  NOTIFICATIONS_PUSH: 'notifications.push',
  REVIEWS_ENABLED: 'reviews.enabled',
  SEARCH_FUZZY: 'search.fuzzy',
  AI_CHATBOT: 'ai.chatbot',
  ITEMS_RECOMMENDATIONS: 'items.recommendations',
  BETA_DARK_MODE: 'beta.darkMode',
  BETA_ANIMATIONS: 'beta.animations',
  BETA_WEB_PUSH: 'beta.webPush',
  ADMIN_BULK_ACTIONS: 'admin.bulkActions',
  ADMIN_ANALYTICS: 'admin.analytics',
  MAINTENANCE_MODE: 'maintenance.mode',
  MAINTENANCE_READ_ONLY: 'maintenance.readOnly',
} as const
