/**
 * Admin LINE Rich Menu API
 * Manage LINE rich menu defaults and per-user links.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken, parseRequestBody, successResponse } from "@/lib/api-response"
import {
  applyDefaultRichMenuToUser,
  clearDefaultRichMenu,
  getDefaultRichMenu,
  getDefaultRichMenuId,
  getUserRichMenu,
  linkRichMenuToUser,
  listRichMenus,
  removeRichMenuFromUser,
  setDefaultRichMenu,
} from "@/lib/line"

type PatchAction = "set-default" | "clear-default" | "set-configured-default"
type PostAction = "apply-default" | "link" | "unlink"

interface PatchBody {
  action?: PatchAction
  richMenuId?: string
}

interface PostBody {
  action?: PostAction
  lineUserId?: string
  richMenuId?: string
}

type AdminAuthResult =
  | { uid: string }
  | { error: NextResponse }

async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const token = getAuthToken(request)
  if (!token) return { error: ApiErrors.unauthorized("Missing authentication token") }

  const decoded = await verifyIdToken(token, true)
  if (!decoded) return { error: ApiErrors.unauthorized("Invalid or expired session") }

  const db = getAdminDb()
  const adminSnap = await db.collection("admins").doc(decoded.uid).get()
  if (!adminSnap.exists) return { error: ApiErrors.forbidden("Admin only") }

  return { uid: decoded.uid }
}

function lineApiError(message?: string) {
  return ApiErrors.internalError(message ? `LINE API error: ${message}` : "LINE API request failed")
}

/** GET /api/admin/line-rich-menu */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth) return auth.error

    const [richMenusResult, defaultResult] = await Promise.all([
      listRichMenus(),
      getDefaultRichMenu(),
    ])

    if (!richMenusResult.success) return lineApiError(richMenusResult.error)
    if (!defaultResult.success) return lineApiError(defaultResult.error)

    return successResponse({
      configuredDefaultRichMenuId: getDefaultRichMenuId(),
      currentDefaultRichMenuId: defaultResult.richMenuId ?? null,
      richMenus: richMenusResult.richMenus ?? [],
    })
  } catch (error) {
    console.error("[Admin LINE Rich Menu] GET Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

/** PATCH /api/admin/line-rich-menu */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth) return auth.error

    const body = await parseRequestBody<PatchBody>(request)
    if (!body) return ApiErrors.badRequest("Invalid JSON body")

    const action = body.action ?? (body.richMenuId ? "set-default" : undefined)
    if (!action) {
      return ApiErrors.badRequest("Missing action. Use set-default, set-configured-default, or clear-default")
    }

    if (action === "clear-default") {
      const result = await clearDefaultRichMenu()
      if (!result.success) return lineApiError(result.error)
      return successResponse({ ok: true, action, richMenuId: null })
    }

    let richMenuId = body.richMenuId?.trim()
    if (action === "set-configured-default") {
      richMenuId = getDefaultRichMenuId() ?? undefined
      if (!richMenuId) {
        return ApiErrors.badRequest("LINE_RICH_MENU_DEFAULT_ID is not configured")
      }
    }

    if (!richMenuId) return ApiErrors.badRequest("Missing richMenuId")

    const result = await setDefaultRichMenu(richMenuId)
    if (!result.success) return lineApiError(result.error)

    return successResponse({ ok: true, action, richMenuId })
  } catch (error) {
    console.error("[Admin LINE Rich Menu] PATCH Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

/** POST /api/admin/line-rich-menu */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth) return auth.error

    const body = await parseRequestBody<PostBody>(request)
    if (!body) return ApiErrors.badRequest("Invalid JSON body")

    const action: PostAction = body.action ?? "apply-default"
    const lineUserId = body.lineUserId?.trim()
    if (!lineUserId) return ApiErrors.badRequest("Missing lineUserId")

    if (action === "unlink") {
      const result = await removeRichMenuFromUser(lineUserId)
      if (!result.success) return lineApiError(result.error)
      return successResponse({ ok: true, action, lineUserId, richMenuId: null })
    }

    if (action === "link") {
      const richMenuId = body.richMenuId?.trim()
      if (!richMenuId) return ApiErrors.badRequest("Missing richMenuId")
      const result = await linkRichMenuToUser(lineUserId, richMenuId)
      if (!result.success) return lineApiError(result.error)
      return successResponse({ ok: true, action, lineUserId, richMenuId })
    }

    const result = await applyDefaultRichMenuToUser(lineUserId)
    if (!result.success) return lineApiError(result.error)
    if (result.skipped) {
      return ApiErrors.badRequest("LINE_RICH_MENU_DEFAULT_ID is not configured")
    }

    return successResponse({
      ok: true,
      action,
      lineUserId,
      richMenuId: result.richMenuId ?? null,
    })
  } catch (error) {
    console.error("[Admin LINE Rich Menu] POST Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

/** DELETE /api/admin/line-rich-menu?lineUserId=... */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get("lineUserId")?.trim()
    if (!lineUserId) return ApiErrors.badRequest("Missing lineUserId")

    const result = await removeRichMenuFromUser(lineUserId)
    if (!result.success) return lineApiError(result.error)

    const current = await getUserRichMenu(lineUserId)
    return successResponse({
      ok: true,
      action: "unlink",
      lineUserId,
      richMenuId: current.success ? (current.richMenuId ?? null) : null,
    })
  } catch (error) {
    console.error("[Admin LINE Rich Menu] DELETE Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

