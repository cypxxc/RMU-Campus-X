import { NextRequest, NextResponse } from "next/server"
import { updateUserStatus } from "@/lib/services/admin/user-actions"
import { updateUserStatusSchema } from "@/lib/schemas"
import { verifyAdminAccess } from "@/lib/admin-api"

// POST /api/admin/users/[id]/status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, user, error } = await verifyAdminAccess(req)
  if (!authorized) return error!

  try {
    const { id: userId } = await params
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    if (!user?.uid || !user?.email) {
      return NextResponse.json({ error: "Admin identity missing" }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const parsed = updateUserStatusSchema.safeParse(body)
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

    const { status, reason, suspendDays, suspendMinutes } = parsed.data

    const result = await updateUserStatus({
      adminId: user.uid,
      adminEmail: user.email,
      userId,
      status,
      reason,
      suspendDays,
      suspendMinutes,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Update Status Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
