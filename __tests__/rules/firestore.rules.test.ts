/**
 * Firebase Security Rules Unit Tests
 * 
 * This file contains comprehensive tests for Firestore security rules
 * using @firebase/rules-unit-testing package.
 * 
 * Run with: npm run test:rules
 * Requires Firebase Emulator running: firebase emulators:start
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
  RulesTestContext,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const PROJECT_ID = "rmu-campus-x-test";

// Test Users
const ELIGIBLE_STUDENT = {
  uid: "student123",
  email: "653120100123@rmu.ac.th",
  email_verified: true,
};

const UNVERIFIED_STUDENT = {
  uid: "unverified456",
  email: "653120100456@rmu.ac.th",
  email_verified: false,
};

const NON_RMU_USER = {
  uid: "external789",
  email: "user@gmail.com",
  email_verified: true,
};

const ADMIN_USER = {
  uid: "admin001",
  email: "admin@rmu.ac.th",
  email_verified: true,
};

const OTHER_STUDENT = {
  uid: "student999",
  email: "653120100999@rmu.ac.th",
  email_verified: true,
};

// ============================================================================
// TEST SETUP
// ============================================================================

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, "../../firestore.rules");
  const rules = fs.readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// Helper: Get authenticated context
function getAuth(user: { uid: string; email: string; email_verified: boolean }): RulesTestContext {
  return testEnv.authenticatedContext(user.uid, {
    email: user.email,
    email_verified: user.email_verified,
  });
}

// Helper: Get unauthenticated context
function getUnauth(): RulesTestContext {
  return testEnv.unauthenticatedContext();
}

// Helper: Setup admin document
async function setupAdmin(adminUid: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "admins", adminUid), {
      email: "admin@rmu.ac.th",
      role: "super_admin",
      createdAt: serverTimestamp(),
    });
  });
}

// Helper: Setup user document (for isActiveUser check)
async function setupUser(
  uid: string,
  data: { email: string; status?: string; displayName?: string }
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", uid), {
      uid,
      email: data.email,
      displayName: data.displayName || data.email.split("@")[0],
      status: data.status || "ACTIVE",
      warningCount: 0,
      createdAt: serverTimestamp(),
    });
  });
}

// ============================================================================
// USERS COLLECTION TESTS
// ============================================================================

describe("Users Collection", () => {
  describe("Read Access", () => {
    it("✅ allows public read of user profiles", async () => {
      // Setup
      await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });

      // Test: Unauthenticated read
      const db = getUnauth().firestore();
      await assertSucceeds(getDoc(doc(db, "users", ELIGIBLE_STUDENT.uid)));
    });

    it("✅ allows authenticated read of any user profile", async () => {
      await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(db, "users", OTHER_STUDENT.uid)));
    });
  });

  describe("Create Access", () => {
    it("✅ allows eligible student to create own profile", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        setDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          uid: ELIGIBLE_STUDENT.uid,
          email: ELIGIBLE_STUDENT.email,
          displayName: "653120100123",
          status: "ACTIVE",
          warningCount: 0,
          createdAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies creating profile for another user", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "users", OTHER_STUDENT.uid), {
          uid: OTHER_STUDENT.uid,
          email: OTHER_STUDENT.email,
          displayName: "Hacker",
          status: "ACTIVE",
          warningCount: 0,
        })
      );
    });

    it("❌ denies non-RMU email user from creating profile", async () => {
      const db = getAuth(NON_RMU_USER).firestore();
      await assertFails(
        setDoc(doc(db, "users", NON_RMU_USER.uid), {
          uid: NON_RMU_USER.uid,
          email: NON_RMU_USER.email,
          displayName: "External",
          status: "ACTIVE",
          warningCount: 0,
        })
      );
    });

    it("❌ denies setting isAdmin to true", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          uid: ELIGIBLE_STUDENT.uid,
          email: ELIGIBLE_STUDENT.email,
          displayName: "Hacker",
          status: "ACTIVE",
          warningCount: 0,
          isAdmin: true, // Privilege escalation attempt
        })
      );
    });

    it("❌ denies setting status to BANNED", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          uid: ELIGIBLE_STUDENT.uid,
          email: ELIGIBLE_STUDENT.email,
          displayName: "Test",
          status: "BANNED", // Invalid initial status
          warningCount: 0,
        })
      );
    });
  });

  describe("Update Access", () => {
    beforeEach(async () => {
      await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    });

    it("✅ allows owner to update safe fields", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          displayName: "New Name",
          bio: "Hello world",
        })
      );
    });

    it("❌ denies owner from changing email", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          email: "hacked@rmu.ac.th",
        })
      );
    });

    it("❌ denies owner from changing status", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          status: "ACTIVE", // Even same value is disallowed
        })
      );
    });

    it("❌ denies other user from updating profile", async () => {
      const db = getAuth(OTHER_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          displayName: "Hacked",
        })
      );
    });
  });

  describe("Admin Access", () => {
    beforeEach(async () => {
      await setupAdmin(ADMIN_USER.uid);
      await setupUser(ADMIN_USER.uid, { email: ADMIN_USER.email });
      await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    });

    it("✅ allows admin to update any user", async () => {
      const db = getAuth(ADMIN_USER).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
          status: "BANNED",
          bannedReason: "Violated terms",
        })
      );
    });

    it("✅ allows admin to delete user", async () => {
      const db = getAuth(ADMIN_USER).firestore();
      await assertSucceeds(deleteDoc(doc(db, "users", ELIGIBLE_STUDENT.uid)));
    });
  });
});

// ============================================================================
// ITEMS COLLECTION TESTS
// ============================================================================

describe("Items Collection", () => {
  beforeEach(async () => {
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });
  });

  describe("Read Access", () => {
    it("✅ allows public read of items", async () => {
      // Setup item
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "items", "item001"), {
          title: "Test Item",
          description: "A test item",
          category: "electronics",
          status: "available",
          postedBy: ELIGIBLE_STUDENT.uid,
          postedByEmail: ELIGIBLE_STUDENT.email,
          postedAt: serverTimestamp(),
        });
      });

      const db = getUnauth().firestore();
      await assertSucceeds(getDoc(doc(db, "items", "item001")));
    });
  });

  describe("Create Access", () => {
    it("✅ allows eligible student to create item", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      const now = Timestamp.now();
      
      await assertSucceeds(
        setDoc(doc(db, "items", "newitem001"), {
          title: "New Item",
          description: "A new item for exchange",
          category: "books",
          status: "available",
          location: "Library",
          postedBy: ELIGIBLE_STUDENT.uid,
          postedByEmail: ELIGIBLE_STUDENT.email,
          postedAt: now, // For testing, in production use serverTimestamp()
        })
      );
    });

    it("❌ denies unverified user from creating item", async () => {
      await setupUser(UNVERIFIED_STUDENT.uid, { email: UNVERIFIED_STUDENT.email });
      
      const db = getAuth(UNVERIFIED_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "items", "newitem002"), {
          title: "Unverified Item",
          description: "Should fail",
          category: "books",
          status: "available",
          postedBy: UNVERIFIED_STUDENT.uid,
          postedByEmail: UNVERIFIED_STUDENT.email,
          postedAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies setting postedBy to another user", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "items", "fake001"), {
          title: "Fake Item",
          description: "Impersonation attempt",
          category: "electronics",
          status: "available",
          postedBy: OTHER_STUDENT.uid, // Different from auth user
          postedByEmail: OTHER_STUDENT.email,
          postedAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies invalid category", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "items", "invalid001"), {
          title: "Invalid Category",
          description: "Has invalid category",
          category: "weapons", // Invalid
          status: "available",
          postedBy: ELIGIBLE_STUDENT.uid,
          postedByEmail: ELIGIBLE_STUDENT.email,
          postedAt: serverTimestamp(),
        })
      );
    });
  });

  describe("Update/Delete Access", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "items", "item001"), {
          title: "Original Title",
          description: "Original description",
          category: "electronics",
          status: "available",
          postedBy: ELIGIBLE_STUDENT.uid,
          postedByEmail: ELIGIBLE_STUDENT.email,
          postedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    });

    it("✅ allows owner to update item", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "items", "item001"), {
          title: "Updated Title",
          description: "Updated description",
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies non-owner from updating item", async () => {
      const db = getAuth(OTHER_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "items", "item001"), {
          title: "Hacked Title",
        })
      );
    });

    it("✅ allows owner to delete item", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(deleteDoc(doc(db, "items", "item001")));
    });

    it("❌ denies non-owner from deleting item", async () => {
      const db = getAuth(OTHER_STUDENT).firestore();
      await assertFails(deleteDoc(doc(db, "items", "item001")));
    });
  });
});

// ============================================================================
// EXCHANGES COLLECTION TESTS
// ============================================================================

describe("Exchanges Collection", () => {
  beforeEach(async () => {
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });
  });

  describe("Create Access", () => {
    it("✅ allows eligible student to create exchange request", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        setDoc(doc(db, "exchanges", "exchange001"), {
          itemId: "item001",
          itemTitle: "Test Item",
          ownerId: OTHER_STUDENT.uid,
          ownerEmail: OTHER_STUDENT.email,
          requesterId: ELIGIBLE_STUDENT.uid,
          requesterEmail: ELIGIBLE_STUDENT.email,
          status: "pending",
          ownerConfirmed: false,
          requesterConfirmed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies creating exchange for another user", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "exchanges", "fake001"), {
          itemId: "item001",
          itemTitle: "Test Item",
          ownerId: "someone",
          ownerEmail: "someone@rmu.ac.th",
          requesterId: OTHER_STUDENT.uid, // Impersonation
          requesterEmail: OTHER_STUDENT.email,
          status: "pending",
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe("Read Access", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "exchanges", "exchange001"), {
          itemId: "item001",
          itemTitle: "Test Item",
          ownerId: OTHER_STUDENT.uid,
          ownerEmail: OTHER_STUDENT.email,
          requesterId: ELIGIBLE_STUDENT.uid,
          requesterEmail: ELIGIBLE_STUDENT.email,
          status: "pending",
        });
      });
    });

    it("✅ allows participants to read exchange", async () => {
      const requesterDb = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(requesterDb, "exchanges", "exchange001")));

      const ownerDb = getAuth(OTHER_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(ownerDb, "exchanges", "exchange001")));
    });

    it("❌ denies non-participant from reading exchange", async () => {
      await setupUser(NON_RMU_USER.uid, { email: NON_RMU_USER.email });
      const db = getAuth(NON_RMU_USER).firestore();
      await assertFails(getDoc(doc(db, "exchanges", "exchange001")));
    });
  });
});

// ============================================================================
// CHAT MESSAGES COLLECTION TESTS
// ============================================================================

describe("Chat Messages Collection", () => {
  beforeEach(async () => {
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });

    // Setup exchange for chat context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "exchanges", "exchange001"), {
        ownerId: OTHER_STUDENT.uid,
        requesterId: ELIGIBLE_STUDENT.uid,
        status: "accepted",
      });
    });
  });

  describe("Create Access", () => {
    it("✅ allows exchange participant to send message", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        setDoc(doc(db, "chatMessages", "msg001"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          senderEmail: ELIGIBLE_STUDENT.email,
          message: "Hello!",
          createdAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies impersonation in senderId", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "chatMessages", "msg002"), {
          exchangeId: "exchange001",
          senderId: OTHER_STUDENT.uid, // Impersonation
          senderEmail: OTHER_STUDENT.email,
          message: "Fake message",
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe("Read Access", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "chatMessages", "msg001"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          message: "Test message",
        });
      });
    });

    it("✅ allows exchange participants to read messages", async () => {
      const db = getAuth(OTHER_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(db, "chatMessages", "msg001")));
    });

    it("❌ denies non-participant from reading messages", async () => {
      await setupUser(NON_RMU_USER.uid, { email: NON_RMU_USER.email });
      
      // Need to setup new exchange where NON_RMU_USER is not participant
      const db = getAuth(NON_RMU_USER).firestore();
      await assertFails(getDoc(doc(db, "chatMessages", "msg001")));
    });
  });

  describe("Update Access", () => {
    it("✅ allows sender to update own message (message, updatedAt)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "chatMessages", "msg001"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          senderEmail: ELIGIBLE_STUDENT.email,
          message: "Original",
          createdAt: serverTimestamp(),
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "chatMessages", "msg001"), {
          message: "Edited",
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("✅ allows recipient to update only readAt", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "chatMessages", "msg002"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          senderEmail: ELIGIBLE_STUDENT.email,
          message: "Hi",
          createdAt: serverTimestamp(),
        });
      });

      const db = getAuth(OTHER_STUDENT).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "chatMessages", "msg002"), {
          readAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies recipient from updating message content", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "chatMessages", "msg003"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          senderEmail: ELIGIBLE_STUDENT.email,
          message: "Hi",
          createdAt: serverTimestamp(),
        });
      });

      const db = getAuth(OTHER_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "chatMessages", "msg003"), {
          message: "Tampered",
        })
      );
    });
  });

  describe("Delete Access", () => {
    it("✅ allows sender to delete own message", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "chatMessages", "msg004"), {
          exchangeId: "exchange001",
          senderId: ELIGIBLE_STUDENT.uid,
          senderEmail: ELIGIBLE_STUDENT.email,
          message: "To delete",
          createdAt: serverTimestamp(),
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(deleteDoc(doc(db, "chatMessages", "msg004")));
    });
  });
});

// ============================================================================
// REPORTS COLLECTION TESTS
// ============================================================================

describe("Reports Collection", () => {
  beforeEach(async () => {
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    await setupAdmin(ADMIN_USER.uid);
    await setupUser(ADMIN_USER.uid, { email: ADMIN_USER.email });
  });

  describe("Create Access", () => {
    it("✅ allows eligible student to create report", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        setDoc(doc(db, "reports", "report001"), {
          reportType: "item_report",
          targetId: "item001",
          reporterId: ELIGIBLE_STUDENT.uid,
          reporterEmail: ELIGIBLE_STUDENT.email,
          reasonCode: "fake_item",
          description: "This item is fake",
          status: "new",
          createdAt: serverTimestamp(),
        })
      );
    });

    it("❌ denies creating report for another user", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "reports", "fake001"), {
          reportType: "item_report",
          targetId: "item001",
          reporterId: OTHER_STUDENT.uid, // Impersonation
          reporterEmail: OTHER_STUDENT.email,
          reasonCode: "fake_item",
          status: "new",
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  describe("Read Access", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "reports", "report001"), {
          reporterId: ELIGIBLE_STUDENT.uid,
          status: "new",
        });
      });
    });

    it("✅ allows reporter to read own report", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(db, "reports", "report001")));
    });

    it("✅ allows admin to read any report", async () => {
      const db = getAuth(ADMIN_USER).firestore();
      await assertSucceeds(getDoc(doc(db, "reports", "report001")));
    });

    it("❌ denies other users from reading report", async () => {
      await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });
      const db = getAuth(OTHER_STUDENT).firestore();
      await assertFails(getDoc(doc(db, "reports", "report001")));
    });
  });

  describe("Update Access", () => {
    it("❌ denies reporter from updating report", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "reports", "report001"), {
          reporterId: ELIGIBLE_STUDENT.uid,
          status: "new",
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "reports", "report001"), {
          status: "resolved",
        })
      );
    });

    it("✅ allows admin to update report", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "reports", "report001"), {
          reporterId: ELIGIBLE_STUDENT.uid,
          status: "new",
        });
      });

      const db = getAuth(ADMIN_USER).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "reports", "report001"), {
          status: "resolved",
          handledBy: ADMIN_USER.uid,
        })
      );
    });
  });
});

// ============================================================================
// NOTIFICATIONS COLLECTION TESTS
// ============================================================================

describe("Notifications Collection", () => {
  beforeEach(async () => {
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
    await setupUser(OTHER_STUDENT.uid, { email: OTHER_STUDENT.email });
  });

  describe("Read Access", () => {
    it("✅ allows owner to read own notifications", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "notifications", "notif001"), {
          userId: ELIGIBLE_STUDENT.uid,
          title: "Test",
          isRead: false,
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(getDoc(doc(db, "notifications", "notif001")));
    });

    it("❌ denies reading other user's notifications", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "notifications", "notif001"), {
          userId: OTHER_STUDENT.uid,
          title: "Private",
          isRead: false,
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(getDoc(doc(db, "notifications", "notif001")));
    });
  });

  describe("Update Access", () => {
    it("✅ allows owner to mark as read", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "notifications", "notif001"), {
          userId: ELIGIBLE_STUDENT.uid,
          title: "Test",
          isRead: false,
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(
        updateDoc(doc(db, "notifications", "notif001"), {
          isRead: true,
        })
      );
    });

    it("❌ denies owner from changing other fields", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "notifications", "notif001"), {
          userId: ELIGIBLE_STUDENT.uid,
          title: "Test",
          isRead: false,
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        updateDoc(doc(db, "notifications", "notif001"), {
          title: "Hacked",
        })
      );
    });
  });

  describe("Delete Access", () => {
    it("✅ allows owner to delete own notification", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "notifications", "notif001"), {
          userId: ELIGIBLE_STUDENT.uid,
          title: "Delete me",
          isRead: true,
        });
      });

      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertSucceeds(deleteDoc(doc(db, "notifications", "notif001")));
    });
  });
});

// ============================================================================
// ADMIN OVERRIDE TESTS
// ============================================================================

describe("Admin Override", () => {
  beforeEach(async () => {
    await setupAdmin(ADMIN_USER.uid);
    await setupUser(ADMIN_USER.uid, { email: ADMIN_USER.email });
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
  });

  it("✅ admin can update any user's status", async () => {
    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "users", ELIGIBLE_STUDENT.uid), {
        status: "SUSPENDED",
        suspendedUntil: Timestamp.now(),
      })
    );
  });

  it("✅ admin can delete any item", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "items", "item001"), {
        title: "To be deleted",
        postedBy: ELIGIBLE_STUDENT.uid,
      });
    });

    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(deleteDoc(doc(db, "items", "item001")));
  });

  it("✅ admin can read all reports", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "reports", "report001"), {
        reporterId: ELIGIBLE_STUDENT.uid,
        status: "new",
      });
    });

    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(getDoc(doc(db, "reports", "report001")));
  });

  it("✅ admin can access cases collection", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "cases", "case001"), {
        type: "item",
        status: "new",
      });
    });

    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(getDoc(doc(db, "cases", "case001")));
    await assertSucceeds(
      updateDoc(doc(db, "cases", "case001"), { status: "resolved" })
    );
  });
});

// ============================================================================
// NON-ELIGIBLE USER DENIAL TESTS
// ============================================================================

describe("Non-Eligible User Denial", () => {
  describe("Unverified Email", () => {
    beforeEach(async () => {
      await setupUser(UNVERIFIED_STUDENT.uid, { email: UNVERIFIED_STUDENT.email });
    });

    it("❌ denies creating items", async () => {
      const db = getAuth(UNVERIFIED_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "items", "item001"), {
          title: "Should fail",
          description: "Unverified user",
          category: "books",
          status: "available",
          postedBy: UNVERIFIED_STUDENT.uid,
          postedByEmail: UNVERIFIED_STUDENT.email,
          postedAt: Timestamp.now(),
        })
      );
    });
  });

  describe("Non-RMU Email", () => {
    beforeEach(async () => {
      await setupUser(NON_RMU_USER.uid, { email: NON_RMU_USER.email });
    });

    it("❌ denies creating user profile", async () => {
      const db = getAuth(NON_RMU_USER).firestore();
      // Note: User might already exist from setup, so this tests the rule
      await assertFails(
        setDoc(doc(db, "users", "newuser"), {
          uid: "newuser",
          email: NON_RMU_USER.email,
          displayName: "External",
          status: "ACTIVE",
          warningCount: 0,
        })
      );
    });

    it("❌ denies creating items", async () => {
      const db = getAuth(NON_RMU_USER).firestore();
      await assertFails(
        setDoc(doc(db, "items", "item001"), {
          title: "External item",
          description: "From non-RMU user",
          category: "books",
          status: "available",
          postedBy: NON_RMU_USER.uid,
          postedByEmail: NON_RMU_USER.email,
          postedAt: Timestamp.now(),
        })
      );
    });

    it("❌ denies creating reports", async () => {
      const db = getAuth(NON_RMU_USER).firestore();
      await assertFails(
        setDoc(doc(db, "reports", "report001"), {
          reportType: "item_report",
          targetId: "item001",
          reporterId: NON_RMU_USER.uid,
          reporterEmail: NON_RMU_USER.email,
          status: "new",
          createdAt: Timestamp.now(),
        })
      );
    });
  });

  describe("Banned User", () => {
    beforeEach(async () => {
      await setupUser(ELIGIBLE_STUDENT.uid, {
        email: ELIGIBLE_STUDENT.email,
        status: "BANNED",
      });
    });

    it("❌ denies creating items", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "items", "item001"), {
          title: "Banned user item",
          description: "Should fail",
          category: "books",
          status: "available",
          postedBy: ELIGIBLE_STUDENT.uid,
          postedByEmail: ELIGIBLE_STUDENT.email,
          postedAt: Timestamp.now(),
        })
      );
    });

    it("❌ denies creating exchanges", async () => {
      const db = getAuth(ELIGIBLE_STUDENT).firestore();
      await assertFails(
        setDoc(doc(db, "exchanges", "exchange001"), {
          itemId: "item001",
          ownerId: OTHER_STUDENT.uid,
          requesterId: ELIGIBLE_STUDENT.uid,
          requesterEmail: ELIGIBLE_STUDENT.email,
          status: "pending",
          createdAt: Timestamp.now(),
        })
      );
    });
  });
});

// ============================================================================
// ADMINS COLLECTION TESTS (Special Case)
// ============================================================================

describe("Admins Collection", () => {
  beforeEach(async () => {
    await setupAdmin(ADMIN_USER.uid);
    await setupUser(ADMIN_USER.uid, { email: ADMIN_USER.email });
    await setupUser(ELIGIBLE_STUDENT.uid, { email: ELIGIBLE_STUDENT.email });
  });

  it("✅ allows user to read own admin status", async () => {
    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(getDoc(doc(db, "admins", ADMIN_USER.uid)));
  });

  it("✅ allows admin to read other admin docs", async () => {
    await setupAdmin("otheradmin");
    
    const db = getAuth(ADMIN_USER).firestore();
    await assertSucceeds(getDoc(doc(db, "admins", "otheradmin")));
  });

  it("❌ denies writing to admins collection", async () => {
    const db = getAuth(ADMIN_USER).firestore();
    await assertFails(
      setDoc(doc(db, "admins", ELIGIBLE_STUDENT.uid), {
        email: ELIGIBLE_STUDENT.email,
        role: "admin",
      })
    );
  });

  it("❌ denies non-admin from reading other admin docs", async () => {
    const db = getAuth(ELIGIBLE_STUDENT).firestore();
    await assertFails(getDoc(doc(db, "admins", ADMIN_USER.uid)));
  });
});
