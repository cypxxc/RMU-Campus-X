/**
 * Client-side helper for authenticated API calls.
 * Use in lib/db and components when calling our API routes.
 * Includes retry with exponential backoff for 429 / 5xx / network errors.
 */

/** Retry/backoff for idempotent requests (GET/HEAD/OPTIONS): max attempts (first + retries) */
const MAX_SAFE_ATTEMPTS = 2
/** Retry/backoff for non-idempotent requests (POST/PATCH/PUT/DELETE): no retries to avoid duplicate actions */
const MAX_UNSAFE_ATTEMPTS = 1
/** Base delay (ms) for exponential backoff */
const BACKOFF_BASE_MS = 500
/** Max delay (ms) between retries */
const BACKOFF_MAX_MS = 15_000
/** Brief cooldown after transient network transport failures */
const NETWORK_RECOVERY_WINDOW_MS = 2_000
let networkRecoveryUntil = 0
const AUTH_TOKEN_CACHE_TTL_MS = 45_000
let cachedAuthToken: { token: string; uid: string; expiresAt: number } | null = null
let pendingTokenPromise: Promise<string | null> | null = null

export async function getAuthToken(): Promise<string | null> {
  try {
    const { getAuth } = await import("firebase/auth")
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) {
      cachedAuthToken = null
      return null
    }

    if (
      cachedAuthToken &&
      cachedAuthToken.uid === currentUser.uid &&
      Date.now() < cachedAuthToken.expiresAt
    ) {
      return cachedAuthToken.token
    }

    if (pendingTokenPromise) {
      return pendingTokenPromise
    }

    pendingTokenPromise = (async () => {
      const token = await currentUser.getIdToken()
      if (!token) return null
      cachedAuthToken = {
        token,
        uid: currentUser.uid,
        expiresAt: Date.now() + AUTH_TOKEN_CACHE_TTL_MS,
      }
      return token
    })()

    try {
      return await pendingTokenPromise
    } finally {
      pendingTokenPromise = null
    }
  } catch {
    cachedAuthToken = null
    pendingTokenPromise = null
    return null
  }
}

type AuthFetchOptions = Omit<RequestInit, "body"> & { body?: unknown }

const TRANSIENT_NETWORK_PATTERNS = [
  "failed to fetch",
  "load failed",
  "fetch failed",
  "networkerror",
  "network changed",
  "err_network_changed",
  "network connection was lost",
  "internet connection appears to be offline",
]

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") return error.message
  if (typeof error === "string") return error
  return ""
}

export function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  const message = getErrorMessage(error).toLowerCase()
  if (!message) return false
  return TRANSIENT_NETWORK_PATTERNS.some((pattern) => message.includes(pattern))
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

function markNetworkRecoveryWindow(): void {
  networkRecoveryUntil = Date.now() + NETWORK_RECOVERY_WINDOW_MS
}

function isNetworkRecovering(): boolean {
  return Date.now() < networkRecoveryUntil
}

function getRetryDelay(attempt: number, res: Response | null): number {
  if (res?.status === 429) {
    const retryAfter = res.headers.get("Retry-After")
    if (retryAfter) {
      const sec = parseInt(retryAfter, 10)
      if (Number.isFinite(sec)) return Math.min(sec * 1000, BACKOFF_MAX_MS)
    }
  }
  const exp = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS)
  const jitter = exp * 0.2 * (Math.random() - 0.5)
  return Math.max(0, Math.floor(exp + jitter))
}

function isRetryable(status: number): boolean {
  if (status === 429) return true
  if (status >= 500 && status < 600) return true
  if (status === 0) return true
  return false
}

function isSafeMethod(method: string | undefined): boolean {
  const normalized = (method || "GET").toUpperCase()
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS"
}

/** สร้าง URL เต็มสำหรับ request (กัน 404 เมื่อ relative path ถูก resolve ผิด) */
function getFetchUrl(url: string): string {
  if (typeof window === "undefined") return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`
}

export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  if (isBrowserOffline() || isNetworkRecovering()) {
    throw new Error("Network is offline")
  }

  const token = await getAuthToken()
  if (!token) {
    throw new Error("Authentication required")
  }
  const { body, ...rest } = options
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (body !== undefined && typeof body !== "string") {
    headers.set("Content-Type", "application/json")
  }
  const bodyPayload =
    body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined

  const fetchUrl = getFetchUrl(url)
  const canRetry = isSafeMethod(rest.method)
  const maxAttempts = canRetry ? MAX_SAFE_ATTEMPTS : MAX_UNSAFE_ATTEMPTS

  let lastRes: Response | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (isBrowserOffline() || isNetworkRecovering()) {
      throw new Error("Network is offline")
    }
    try {
      const res = await fetch(fetchUrl, { ...rest, headers, body: bodyPayload })
      lastRes = res
      if (res.ok) return res
      if (!canRetry || !isRetryable(res.status) || attempt === maxAttempts - 1) return res
    } catch (e) {
      lastError = e
      if (isTransientNetworkError(e)) {
        markNetworkRecoveryWindow()
        throw e
      }
      if (!canRetry || !isRetryable(0) || attempt === maxAttempts - 1) throw e
    }
    const delay = getRetryDelay(attempt, lastRes)
    await new Promise((r) => setTimeout(r, delay))
  }

  if (lastRes) return lastRes
  throw lastError ?? new Error("Request failed")
}

export async function authFetchJson<T = unknown>(
  url: string,
  options: AuthFetchOptions = {}
): Promise<{ data?: T; error?: string; success?: boolean }> {
  const res = await authFetch(url, options)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = json.error || res.statusText || "Request failed"
    if (res.status === 404) {
      throw new Error(`${message} (404: ${url}). ตรวจสอบว่า API route มีอยู่และ dev server รันอยู่`)
    }
    throw new Error(message)
  }
  return json
}
