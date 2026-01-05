/**
 * Application Routes
 * Centralized route definitions for the application
 */
export const ROUTES = {
  // Public routes
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",

  // Protected routes
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  POST_ITEM: "/post-item",
  MY_EXCHANGES: "/my-exchanges",
  NOTIFICATIONS: "/notifications",
  SUPPORT: "/support",

  // Dynamic routes
  ITEM_DETAIL: (id: string) => `/item/${id}`,
  CHAT: (exchangeId: string) => `/chat/${exchangeId}`,
  REPORT: "/report",

  // Admin routes
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_ITEMS: "/admin/items",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_LOGS: "/admin/logs",
} as const

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.VERIFY_EMAIL]

/**
 * Admin routes that require admin privileges
 */
export const ADMIN_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_ITEMS,
  ROUTES.ADMIN_REPORTS,
  ROUTES.ADMIN_LOGS,
]
