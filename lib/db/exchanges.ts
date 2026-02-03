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

// Exchanges
export const createExchange = async (
  exchangeData: Omit<Exchange, "id" | "createdAt" | "updatedAt">
) => {
  return apiCall(
    async () => {
      const db = getFirebaseDb();

      const result = await runTransaction(db, async (transaction) => {
        // 1. Check item availability
        const itemRef = doc(db, "items", exchangeData.itemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error("Item not found");
        }

        const item = itemDoc.data() as any;
        if (item.status !== "available") {
          throw new Error(
            `Item is no longer available (status: ${item.status})`
          );
        }

        // 2. Create Exchange
        const newExchangeRef = doc(collection(db, "exchanges"));
        transaction.set(newExchangeRef, {
          ...exchangeData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 3. Update Item Status
        transaction.update(itemRef, {
          status: "pending",
          updatedAt: serverTimestamp(),
        });

        return newExchangeRef.id;
      });

      // 4. Notify (outside transaction)
      try {
        await createNotification({
          userId: exchangeData.ownerId,
          title: "มีคำขอใหม่",
          message: `มีผู้ขอแลกเปลี่ยน "${exchangeData.itemTitle}" ของคุณ`,
          type: "exchange",
          relatedId: result,
        });
      } catch (error) {
        console.error("[createExchange] Notification failed:", error);
        // Consume error so it doesn't fail the transaction result
      }

      return result;
    },
    "createExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};

// Pagination support for exchanges
export const getExchangesByUser = async (
  userId: string,
  pageSize: number = 20,
  lastDoc: any = null
): Promise<
  ApiResponse<{ exchanges: Exchange[]; lastDoc: any; hasMore: boolean }>
> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      let q = query(
        collection(db, "exchanges"),
        where("requesterId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const exchanges = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Exchange)
      );

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      return {
        exchanges,
        lastDoc: lastVisible,
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
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      const docRef = doc(db, "exchanges", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

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
 * Atomically confirm an exchange and check for completion
 */
export const confirmExchange = async (
  exchangeId: string,
  role: "owner" | "requester"
): Promise<ApiResponse<{ status: ExchangeStatus }>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      const exchangeRef = doc(db, "exchanges", exchangeId);

      const result = await runTransaction(db, async (transaction) => {
        // 1. Read exchange
        const exchangeDoc = await transaction.get(exchangeRef);
        if (!exchangeDoc.exists()) throw new Error("Exchange not found");

        const exchange = exchangeDoc.data() as Exchange;

        // Guard: Only allow confirmation if status is acceptable
        if (!["in_progress", "accepted"].includes(exchange.status)) {
          throw new Error(
            `Cannot confirm exchange in status: ${exchange.status}`
          );
        }

        // 2. Update confirmation status
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

        // 3. Check if both confirmed
        let newStatus = exchange.status;
        if (ownerConfirmed && requesterConfirmed) {
          updates.status = "completed";
          newStatus = "completed";

          // Update ITEM status to completed
          const itemRef = doc(db, "items", exchange.itemId);
          transaction.update(itemRef, {
            status: "completed",
            updatedAt: serverTimestamp(),
          });
        }

        transaction.update(exchangeRef, updates);
        return { status: newStatus, exchange };
      });

      // 4. Send notifications (outside transaction to avoid complex logic inside)
      if (result.status === "completed") {
        // Notify Owner
        await createNotification({
          userId: result.exchange.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId,
        });

        // Notify Requester
        await createNotification({
          userId: result.exchange.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
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

import { writeBatch } from "firebase/firestore";

export const deleteExchange = async (exchangeId: string) => {
  return apiCall(
    async () => {
      const db = getFirebaseDb();
      console.log("[deleteExchange] Starting atomic deletion:", exchangeId);

      // 1. Get all chat messages
      const messagesQuery = query(
        collection(db, "chatMessages"),
        where("exchangeId", "==", exchangeId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      // 2. Create Batch
      const batch = writeBatch(db);

      // 3. Add Message Deletes to Batch
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Add Exchange Delete to Batch
      const exchangeRef = doc(db, "exchanges", exchangeId);
      batch.delete(exchangeRef);

      // 5. Commit Batch
      console.log(
        `[deleteExchange] Committing batch for ${
          messagesSnapshot.size + 1
        } operations...`
      );
      await batch.commit();

      console.log("[deleteExchange] Atomic deletion successful");
    },
    "deleteExchange",
    TIMEOUT_CONFIG.STANDARD
  );
};
