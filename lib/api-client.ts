/**
 * Client-side helper for authenticated API calls.
 * Use in lib/db and components when calling our API routes.
 */

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
  return fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  })
}

export async function authFetchJson<T = unknown>(
  url: string,
  options: AuthFetchOptions = {}
): Promise<{ data?: T; error?: string; success?: boolean }> {
  const res = await authFetch(url, options)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || res.statusText || "Request failed")
  }
  return json
}
