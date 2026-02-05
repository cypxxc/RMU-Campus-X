/**
 * Confirm Exchange API
 * Handles "เริ่มดำเนินการ" / "ยืนยันส่งมอบ/รับของแล้ว" with atomic transaction.
 * Runs server-side with Admin SDK so both exchange and item can be updated
 * regardless of who confirms (avoids "Missing or insufficient permissions" when
 * requester confirms second and client would update items collection).
 */

import { NextResponse } from "next/server";
import { withValidation, type ValidationContext } from "@/lib/api-validation";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { confirmExchangeSchema } from "@/lib/schemas";
import type { ExchangeStatus } from "@/types";

export const POST = withValidation(
  confirmExchangeSchema,
  async (_request, data, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context missing", code: "AUTH_ERROR" },
        { status: 401 }
      );
    }

    const { exchangeId, role } = data;
    const userId = ctx.userId;

    try {
      const db = getAdminDb();
      const exchangeRef = db.collection("exchanges").doc(exchangeId);

      const result = await db.runTransaction(async (transaction) => {
        const exchangeDoc = await transaction.get(exchangeRef);
        if (!exchangeDoc.exists) {
          throw new Error("Exchange not found");
        }

        const exchange = exchangeDoc.data() as {
          status: ExchangeStatus;
          ownerId: string;
          requesterId: string;
          ownerConfirmed?: boolean;
          requesterConfirmed?: boolean;
          itemId: string;
          itemTitle: string;
        };

        if (!["accepted", "in_progress"].includes(exchange.status)) {
          throw new Error(
            `Cannot confirm exchange in status: ${exchange.status}`
          );
        }

        const isOwner = exchange.ownerId === userId;
        const isRequester = exchange.requesterId === userId;
        if (
          (role === "owner" && !isOwner) ||
          (role === "requester" && !isRequester)
        ) {
          throw new Error("Only the owner or requester can confirm for their role");
        }

        let ownerConfirmed = exchange.ownerConfirmed === true;
        let requesterConfirmed = exchange.requesterConfirmed === true;
        if (role === "owner") ownerConfirmed = true;
        else requesterConfirmed = true;

        const updates: Record<string, unknown> = {
          updatedAt: FieldValue.serverTimestamp(),
          ownerConfirmed,
          requesterConfirmed,
        };

        let newStatus: ExchangeStatus = exchange.status;

        if (ownerConfirmed && requesterConfirmed) {
          newStatus = "completed";
          updates.status = "completed";

          const itemRef = db.collection("items").doc(exchange.itemId);
          transaction.update(itemRef, {
            status: "completed",
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        transaction.update(exchangeRef, updates);

        return {
          status: newStatus,
          ownerId: exchange.ownerId,
          requesterId: exchange.requesterId,
          itemTitle: exchange.itemTitle,
        };
      });

      // Notifications (outside transaction)
      if (result.status === "completed") {
        await db.collection("notifications").add({
          userId: result.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        await db.collection("notifications").add({
          userId: result.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        const otherUserId =
          role === "owner" ? result.requesterId : result.ownerId;
        const title = "อีกฝ่ายยืนยันแล้ว";
        const message =
          role === "owner"
            ? `เจ้าของสิ่งของ "${result.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`
            : `ผู้ขอรับ "${result.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`;
        await db.collection("notifications").add({
          userId: otherUserId,
          title,
          message,
          type: "exchange",
          relatedId: exchangeId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return NextResponse.json({
        success: true,
        data: { status: result.status },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (
        message.includes("not found") ||
        message.includes("Exchange not found")
      ) {
        return NextResponse.json(
          { error: message, code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      if (
        message.includes("Only the owner") ||
        message.includes("cannot confirm")
      ) {
        return NextResponse.json(
          { error: message, code: "FORBIDDEN" },
          { status: 403 }
        );
      }
      if (message.includes("Cannot confirm")) {
        return NextResponse.json(
          { error: message, code: "INVALID_STATE" },
          { status: 400 }
        );
      }

      console.error("[ConfirmExchange] Error:", error);
      return NextResponse.json(
        { error: message, code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  },
  { requireAuth: true }
);
