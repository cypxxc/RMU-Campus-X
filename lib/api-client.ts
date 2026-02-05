/**
 * Client-side helper for authenticated API calls.
 * Use in lib/db and components when calling our API routes.
 * Includes retry with exponential backoff for 429 / 5xx / network errors.
 */

/** Retry/backoff for API gateway: max attempts (first + retries) */
const MAX_RETRIES = 3
/** Base delay (ms) for exponential backoff */
const BACKOFF_BASE_MS = 1000
/** Max delay (ms) between retries */
const BACKOFF_MAX_MS = 15_000

export async function getAuthToken(): Promise<string | null> {
  try {
    const { getAuth } = await import("firebase/auth")
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()
    return token ?? null
  } catch {
    return null
  }
}

type AuthFetchOptions = Omit<RequestInit, "body"> & { body?: unknown }

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

function isRetryable(status: number, error: unknown): boolean {
  if (status === 429) return true
  if (status >= 500 && status < 600) return true
  if (status === 0) return true
  if (error instanceof TypeError && (error.message === "Failed to fetch" || error.message === "Load failed")) return true
  return false
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

  let lastRes: Response | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(fetchUrl, { ...rest, headers, body: bodyPayload })
      lastRes = res
      if (res.ok) return res
      if (!isRetryable(res.status, null) || attempt === MAX_RETRIES - 1) return res
    } catch (e) {
      lastError = e
      if (!isRetryable(0, e) || attempt === MAX_RETRIES - 1) throw e
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
