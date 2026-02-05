import {
  collection,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Exchange, ExchangeStatus } from "@/types";
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper";
import { authFetchJson } from "@/lib/api-client";
import { createNotification } from "./notifications";

const isClient = typeof window !== "undefined";

// Exchanges – บน client ใช้ API ทั้งหมด
export const createExchange = async (
  exchangeData: Omit<Exchange, "id" | "createdAt" | "updatedAt">
) => {
  if (isClient) {
    return apiCall(
      async () => {
        const res = await authFetchJson<{ exchangeId?: string }>("/api/exchanges", {
          method: "POST",
          body: {
            itemId: exchangeData.itemId,
            itemTitle: exchangeData.itemTitle,
            ownerId: exchangeData.ownerId,
            ownerEmail: exchangeData.ownerEmail,
            requesterId: exchangeData.requesterId,
            requesterEmail: exchangeData.requesterEmail,
            requesterName: exchangeData.requesterName,
          },
        });
        const id = res?.data?.exchangeId;
        if (!id) throw new Error(res?.error || "Failed to create exchange");
        return id;
      },
      "createExchange",
      TIMEOUT_CONFIG.STANDARD
    );
  }
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      const result = await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, "items", exchangeData.itemId);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) throw new Error("Item not found");
        const item = itemDoc.data() as any;
        if (item.status !== "available") throw new Error(`Item is no longer available (status: ${item.status})`);
        const newExchangeRef = doc(collection(db, "exchanges"));
        transaction.set(newExchangeRef, { ...exchangeData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        transaction.update(itemRef, { status: "pending", updatedAt: serverTimestamp() });
        return newExchangeRef.id;
      });
      try {
        await createNotification({
          userId: exchangeData.ownerId,
          title: "มีคำขอใหม่",
          message: `มีผู้ขอแลกเปลี่ยน "${exchangeData.itemTitle}" ของคุณ`,
          type: "exchange",
          relatedId: result,
        });
      } catch (e) {
        console.error("[createExchange] Notification failed:", e);
      }
      return result;
    },
    "createExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};

// Pagination support for exchanges – บน client ใช้ GET /api/exchanges
export const getExchangesByUser = async (
  userId: string,
  pageSize: number = 20,
  lastDoc: any = null
): Promise<
  ApiResponse<{ exchanges: Exchange[]; lastDoc: any; hasMore: boolean }>
> => {
  if (isClient) {
    return apiCall(
      async () => {
        const res = await authFetchJson<{ exchanges?: Exchange[] }>("/api/exchanges", { method: "GET" });
        const list = res?.data?.exchanges ?? [];
        return {
          exchanges: list,
          lastDoc: null,
          hasMore: false,
        };
      },
      "getExchangesByUser",
      TIMEOUT_CONFIG.STANDARD
    );
  }
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      let q = query(
        collection(db, "exchanges"),
        where("requesterId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      if (lastDoc) q = query(q, startAfter(lastDoc));
      const snapshot = await getDocs(q);
      const exchanges = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Exchange));
      return {
        exchanges,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    },
    "getExchangesByUser",
    TIMEOUT_CONFIG.STANDARD
  );
};

export const getExchangeById = async (
  id: string
): Promise<ApiResponse<Exchange | null>> => {
  if (isClient) {
    return apiCall(
      async () => {
        try {
          const res = await authFetchJson<{ exchange?: Exchange & { id?: string } }>(`/api/exchanges/${id}`, { method: "GET" });
          const raw = res as unknown as { exchange?: Exchange & { id?: string } };
          const ex = raw?.exchange;
          if (!ex) return null;
          const { id: _exId, ...rest } = ex;
          return { ...rest, id: _exId ?? id } as Exchange;
        } catch {
          return null;
        }
      },
      "getExchangeById",
      TIMEOUT_CONFIG.QUICK
    );
  }
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      const docSnap = await getDoc(doc(db, "exchanges", id));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Exchange;
    },
    "getExchangeById",
    TIMEOUT_CONFIG.QUICK
  );
};

export const updateExchange = async (id: string, data: Partial<Exchange>) => {
  const db = getFirebaseDb();
  const docRef = doc(db, "exchanges", id);

  // Guard: specific fields only
  if (data.status) {
    throw new Error(
      "Use specialized functions (respondToExchange, confirmExchange) to change status"
    );
  }

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const respondToExchange = async (
  exchangeId: string,
  action: "accept" | "reject",
  userId: string
) => {
  return apiCall(
    async () => {
      await authFetchJson("/api/exchanges/respond", {
        method: "POST",
        body: { exchangeId, action, userId },
      });
    },
    "respondToExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};

/**
 * Atomically confirm an exchange and check for completion.
 * Uses POST /api/exchanges/confirm (server-side) so both exchange and item
 * can be updated regardless of who confirms (avoids Firestore permission
 * error when requester confirms second).
 */
export const confirmExchange = async (
  exchangeId: string,
  role: "owner" | "requester"
): Promise<ApiResponse<{ status: ExchangeStatus }>> => {
  if (isClient) {
    return apiCall(
      async () => {
        const res = await authFetchJson<{ data?: { status: ExchangeStatus } }>(
          "/api/exchanges/confirm",
          { method: "POST", body: { exchangeId, role } }
        );
        const status = res.data?.status;
        if (status === undefined) {
          throw new Error("ไม่ได้รับสถานะจากเซิร์ฟเวอร์");
        }
        return { status };
      },
      "confirmExchange",
      TIMEOUT_CONFIG.STANDARD
    );
  }

  // Server/SSR path: keep original Firestore transaction (e.g. server components)
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      const exchangeRef = doc(db, "exchanges", exchangeId);

      const result = await runTransaction(db, async (transaction) => {
        const exchangeDoc = await transaction.get(exchangeRef);
        if (!exchangeDoc.exists()) throw new Error("Exchange not found");

        const exchange = exchangeDoc.data() as Exchange;

        if (!["in_progress", "accepted"].includes(exchange.status)) {
          throw new Error(
            `Cannot confirm exchange in status: ${exchange.status}`
          );
        }

        const updates: Partial<Exchange> = {
          updatedAt: serverTimestamp() as any,
        };

        let ownerConfirmed = exchange.ownerConfirmed;
        let requesterConfirmed = exchange.requesterConfirmed;

        if (role === "owner") {
          updates.ownerConfirmed = true;
          ownerConfirmed = true;
        } else {
          updates.requesterConfirmed = true;
          requesterConfirmed = true;
        }

        let newStatus = exchange.status;
        if (ownerConfirmed && requesterConfirmed) {
          updates.status = "completed";
          newStatus = "completed";

          const itemRef = doc(db, "items", exchange.itemId);
          transaction.update(itemRef, {
            status: "completed",
            updatedAt: serverTimestamp(),
          });
        }

        transaction.update(exchangeRef, updates);
        return { status: newStatus, exchange };
      });

      if (result.status === "completed") {
        await createNotification({
          userId: result.exchange.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId,
        });
        await createNotification({
          userId: result.exchange.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId,
        });
      } else {
        const otherUserId = role === "owner" ? result.exchange.requesterId : result.exchange.ownerId;
        const title = "อีกฝ่ายยืนยันแล้ว";
        const message =
          role === "owner"
            ? `เจ้าของสิ่งของ "${result.exchange.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`
            : `ผู้ขอรับ "${result.exchange.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`;
        await createNotification({
          userId: otherUserId,
          title,
          message,
          type: "exchange",
          relatedId: exchangeId,
        });
      }

      return { status: result.status };
    },
    "confirmExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};

export const cancelExchange = async (
  exchangeId: string,
  _itemId: string, // Kept for signature compatibility
  userId: string,
  reason?: string
) => {
  return apiCall(
    async () => {
      await authFetchJson("/api/exchanges/cancel", {
        method: "POST",
        body: { exchangeId, userId, reason },
      });
    },
    "cancelExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};

/** ซ่อนแชทจากรายการของฉัน — อีกฝ่ายยังเห็นแชทได้ */
export const hideExchange = async (exchangeId: string) => {
  if (isClient) {
    return apiCall(
      async () => {
        await authFetchJson(`/api/exchanges/${exchangeId}/hide`, { method: "POST" });
      },
      "hideExchange",
      TIMEOUT_CONFIG.STANDARD
    );
  }
  throw new Error("hideExchange is only supported on the client via API");
};

/** ลบ exchange และข้อความแชทจริง (หายทั้งสองฝ่าย) — ใช้เมื่อต้องการลบถาวร */
export const deleteExchange = async (exchangeId: string) => {
  if (isClient) {
    return apiCall(
      async () => {
        await authFetchJson(`/api/exchanges/${exchangeId}`, { method: "DELETE" });
      },
      "deleteExchange",
      TIMEOUT_CONFIG.STANDARD
    );
  }
  throw new Error("deleteExchange is only supported on the client via API");
};
