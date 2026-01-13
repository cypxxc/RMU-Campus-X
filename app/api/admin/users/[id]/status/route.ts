import { NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { updateUserStatus } from "@/lib/services/admin/user-actions"

// POST /api/admin/users/[id]/status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const userId = resolvedParams.id
    
    // 1. Verify Admin Token
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) { // Add isAdmin check if you have custom claims
        return NextResponse.json({ error: "Invalid Token" }, { status: 403 })
    }

    // 2. Get Request Body
    const body = await req.json()
    const { status, reason, suspendDays, suspendMinutes } = body

    if (!status || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // 3. Call Service
    const result = await updateUserStatus({
        adminId: decodedToken.uid,
        adminEmail: decodedToken.email || "unknown",
        userId,
        status,
        reason,
        suspendDays,
        suspendMinutes
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error("[API] Update Status Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
