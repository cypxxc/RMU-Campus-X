import { NextRequest, NextResponse } from "next/server"
import { issueWarning } from "@/lib/services/admin/user-actions"
import { issueWarningSchema } from "@/lib/schemas"
import { verifyAdminAccess } from "@/lib/admin-api"

// Runtime configuration สำหรับ Vercel
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/admin/users/[id]/warning
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, user, error } = await verifyAdminAccess(req)
    if (!authorized) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params (Next.js 15+ pattern)
    let userId: string
    try {
      const resolvedParams = await params
      userId = resolvedParams.id
    } catch (paramsError) {
      console.error("[API] Failed to resolve params:", paramsError)
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      )
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid user id" },
        { status: 400 }
      )
    }

    if (!user?.uid || !user?.email) {
      console.error("[API] Admin identity missing:", { uid: user?.uid, email: user?.email })
      return NextResponse.json(
        { error: "Admin identity missing" },
        { status: 403 }
      )
    }

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    // Validate request body
    const parsed = issueWarningSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.errors.map((issue) => ({
            field: issue.path.join(".") || "root",
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Issue warning
    const result = await issueWarning({
      adminId: user.uid,
      adminEmail: user.email,
      userId,
      reason: parsed.data.reason,
      relatedReportId: parsed.data.relatedReportId,
      relatedItemId: parsed.data.relatedItemId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error("[API] Issue Warning Error:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    })

    // Return detailed error in development, generic in production
    const isDev = process.env.NODE_ENV === "development"
    return NextResponse.json(
      {
        error: "Internal Server Error",
        ...(isDev && { detail: errorMessage }),
      },
      { status: 500 }
    )
  }
}
