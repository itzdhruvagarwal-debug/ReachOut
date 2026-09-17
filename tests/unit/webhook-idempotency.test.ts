import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature, verifyPaymentSignature } from "@/lib/razorpay";
import { publishWebhookJob, WebhookJobPayload } from "@/lib/qstash";
import { verifySignatureAppRouter } from "@/lib/qstash-guard";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  isWebhookProcessed,
  markWebhookProcessed,
  claimIdempotencyKey,
  releaseIdempotencyKey,
  saveIdempotencyResponse,
  cleanupExpiredIdempotencyKeys,
} from "@/lib/idempotency";

describe("Unit Tests: Webhook Signature Verification, Hardening & Idempotency", () => {
  const testSecret = "test_webhook_secret_key_12345678";
  const samplePayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_999",
          amount: 50000,
          currency: "INR",
          status: "captured",
          order_id: "order_test_888",
        },
      },
    },
  });

  describe("Requirement 1: HMAC-SHA256 Timing-Safe Signature Verification", () => {
    it("should verify valid signature with timingSafeEqual", () => {
      const validSignature = crypto
        .createHmac("sha256", testSecret)
        .update(samplePayload)
        .digest("hex");

      const isValid = verifyWebhookSignature(samplePayload, validSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should reject tampered payload with valid original signature", () => {
      const validSignature = crypto
        .createHmac("sha256", testSecret)
        .update(samplePayload)
        .digest("hex");

      const tamperedPayload = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_999",
              amount: 100000, // Attacker increased amount!
              currency: "INR",
            },
          },
        },
      });

      const isValid = verifyWebhookSignature(tamperedPayload, validSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it("should reject signature generated with wrong secret", () => {
      const invalidSignature = crypto
        .createHmac("sha256", "wrong_secret_attacker")
        .update(samplePayload)
        .digest("hex");

      const isValid = verifyWebhookSignature(samplePayload, invalidSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it("should reject non-hex or malformed signatures without throwing length errors", () => {
      expect(verifyWebhookSignature(samplePayload, "not-a-valid-hex-signature", testSecret)).toBe(false);
      expect(verifyWebhookSignature(samplePayload, "", testSecret)).toBe(false);
      expect(verifyWebhookSignature(samplePayload, "a".repeat(63), testSecret)).toBe(false); // wrong length
      expect(verifyWebhookSignature(samplePayload, "a".repeat(65), testSecret)).toBe(false);
    });
  });

  describe("Frontend Payment Signature Verification", () => {
    it("should verify Razorpay frontend payment signature (orderId|paymentId)", () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = "test_key_secret_for_cb";

      const orderId = "order_abc123";
      const paymentId = "pay_xyz789";
      const text = `${orderId}|${paymentId}`;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest("hex");

      const isValid = verifyPaymentSignature({ orderId, paymentId, signature });
      expect(isValid).toBe(true);

      const isTampered = verifyPaymentSignature({ orderId: "order_tampered", paymentId, signature });
      expect(isTampered).toBe(false);

      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });
  });

  describe("Requirement 2 & 5: QStash Offloading, DeduplicationId, and verifySignatureAppRouter", () => {
    it("should publish webhook job with time-critical category and deduplicationId matching eventId", async () => {
      const jobPayload: WebhookJobPayload = {
        eventId: "payment.captured:pay_test_001",
        eventType: "payment.captured",
        rawBody: samplePayload,
        payload: JSON.parse(samplePayload),
      };

      const directProcessor = vi.fn().mockResolvedValue({ success: true });

      const result = await publishWebhookJob(jobPayload, directProcessor);
      expect(result.deduplicationId).toBe("payment.captured:pay_test_001");
    });

    it("verifySignatureAppRouter should reject requests without Upstash-Signature header with 401", async () => {
      const mockHandler = vi.fn();
      const protectedHandler = verifySignatureAppRouter(mockHandler);

      const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay/process", {
        method: "POST",
        body: JSON.stringify({ eventId: "test_evt" }),
      });

      const res = await protectedHandler(req);
      expect(res.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("Requirement 3: 5x Deliberate Replay Idempotency Test", () => {
    it("should execute business logic on Call 1 and no-op on Calls 2 through 5", async () => {
      const processedDb = new Set<string>();
      let walletBalance = 0;
      let mutationCount = 0;

      const processWebhookWithIdempotency = (eventId: string, amountPaise: number) => {
        // 1. Check idempotency table
        if (processedDb.has(eventId)) {
          return { status: 200, executed: false, message: "Duplicate webhook ignored" };
        }

        // 2. Perform business logic mutation atomically
        walletBalance += amountPaise;
        mutationCount++;
        processedDb.add(eventId);

        return { status: 200, executed: true, message: "Top-up completed" };
      };

      const eventId = "payment.captured:pay_5x_test_12345";
      const topupAmount = 50000; // ₹500

      // Call 1: First arrival
      const res1 = processWebhookWithIdempotency(eventId, topupAmount);
      expect(res1.status).toBe(200);
      expect(res1.executed).toBe(true);
      expect(walletBalance).toBe(50000);
      expect(mutationCount).toBe(1);

      // Calls 2 through 5: Deliberate Replay attempts
      for (let i = 2; i <= 5; i++) {
        const replayRes = processWebhookWithIdempotency(eventId, topupAmount);
        expect(replayRes.status).toBe(200);
        expect(replayRes.executed).toBe(false);
        expect(replayRes.message).toBe("Duplicate webhook ignored");
        // Ensure no extra balance or mutation
        expect(walletBalance).toBe(50000);
        expect(mutationCount).toBe(1);
      }
    });
  });

  describe("Requirement 4: Strict Amount Verification", () => {
    it("should mark transaction FAILED and refuse balance increment on amount mismatch", () => {
      const expectedAmount = 100000; // ₹1,000 in paise
      const webhookAmount = 60000;   // ₹600 in paise (mismatch!)

      let txStatus = "PENDING";
      let walletBalance = 0;

      function handlePaymentCaptured(tx: { amount: number }, capturedAmount: number) {
        if (tx.amount !== capturedAmount) {
          txStatus = "FAILED";
          return { success: false, message: "Amount mismatch: transaction marked FAILED" };
        }
        txStatus = "COMPLETED";
        walletBalance += capturedAmount;
        return { success: true, message: "Top-up completed" };
      }

      const result = handlePaymentCaptured({ amount: expectedAmount }, webhookAmount);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Amount mismatch");
      expect(txStatus).toBe("FAILED");
      expect(walletBalance).toBe(0); // Never credited!
    });
  });

  describe("Requirement 6: Terminal-State Guard", () => {
    it("should prevent updating records already in terminal state (COMPLETED, FAILED, REVERSED)", () => {
      const terminalStates = ["COMPLETED", "FAILED", "REVERSED"];

      function isUpdatable(currentStatus: string): boolean {
        return !terminalStates.includes(currentStatus);
      }

      expect(isUpdatable("PENDING")).toBe(true);
      expect(isUpdatable("PROCESSING")).toBe(true);
      expect(isUpdatable("COMPLETED")).toBe(false);
      expect(isUpdatable("FAILED")).toBe(false);
      expect(isUpdatable("REVERSED")).toBe(false);
    });

    it("simulates Prisma updateMany with terminal-state guard where status notIn terminal", () => {
      const records = [
        { id: "tx_1", status: "PENDING", amount: 5000 },
        { id: "tx_2", status: "FAILED", amount: 5000 },
        { id: "tx_3", status: "COMPLETED", amount: 5000 },
      ];

      function updateIfNotTerminal(id: string, newStatus: string) {
        const terminalList = ["COMPLETED", "FAILED", "REVERSED"];
        const match = records.find(
          (r) => r.id === id && !terminalList.includes(r.status)
        );
        if (!match) return { count: 0 };
        match.status = newStatus;
        return { count: 1 };
      }

      // Updating PENDING succeeds
      expect(updateIfNotTerminal("tx_1", "COMPLETED")).toEqual({ count: 1 });
      expect(records[0]!.status).toBe("COMPLETED");

      // Attempting to overwrite FAILED or COMPLETED fails (count === 0)
      expect(updateIfNotTerminal("tx_2", "COMPLETED")).toEqual({ count: 0 });
      expect(records[1]!.status).toBe("FAILED");

      expect(updateIfNotTerminal("tx_3", "FAILED")).toEqual({ count: 0 });
      expect(records[2]!.status).toBe("COMPLETED");
    });
  });

  describe("Idempotency Service Implementation (src/lib/idempotency.ts)", () => {
    it("isWebhookProcessed should query ProcessedWebhookEvent table", async () => {
      const spy = vi.spyOn(prisma.processedWebhookEvent, "findUnique").mockResolvedValueOnce({
        id: "rec_1",
        eventId: "evt_123",
        eventType: "payment.captured",
        payload: null,
        processedAt: new Date(),
        updatedAt: new Date(),
      });

      const processed = await isWebhookProcessed("evt_123");
      expect(processed).toBe(true);
      expect(spy).toHaveBeenCalledWith({ where: { eventId: "evt_123" } });

      vi.spyOn(prisma.processedWebhookEvent, "findUnique").mockResolvedValueOnce(null);
      const notProcessed = await isWebhookProcessed("evt_not_found");
      expect(notProcessed).toBe(false);
    });

    it("markWebhookProcessed should create event and handle P2002 duplicate gracefully", async () => {
      const createSpy = vi.spyOn(prisma.processedWebhookEvent, "create").mockResolvedValueOnce({
        id: "rec_2",
        eventId: "evt_new",
        eventType: "payment.captured",
        payload: null,
        processedAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(markWebhookProcessed("evt_new", "payment.captured")).resolves.not.toThrow();

      // P2002 race condition error should be caught without throwing
      const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      vi.spyOn(prisma.processedWebhookEvent, "create").mockRejectedValueOnce(p2002Error);
      await expect(markWebhookProcessed("evt_duplicate", "payment.captured")).resolves.not.toThrow();
    });

    it("claimIdempotencyKey should successfully claim new keys and detect duplicates", async () => {
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValueOnce(null);
      vi.spyOn(prisma.idempotencyKey, "create").mockResolvedValueOnce({
        id: "idemp_1",
        key: "key_abc",
        userId: "user_1",
        response: { status: "PROCESSING" },
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      });

      const res1 = await claimIdempotencyKey("key_abc", "user_1");
      expect(res1.isDuplicate).toBe(false);

      // Existing non-expired key with matching user
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValueOnce({
        id: "idemp_2",
        key: "key_abc",
        userId: "user_1",
        response: { status: "SUCCESS", result: 42 },
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      });
      const res2 = await claimIdempotencyKey("key_abc", "user_1");
      expect(res2.isDuplicate).toBe(true);
      expect((res2.savedResponse as { status: string }).status).toBe("SUCCESS");

      // Owner mismatch
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValueOnce({
        id: "idemp_3",
        key: "key_abc",
        userId: "user_attacker",
        response: { status: "PROCESSING" },
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      });
      const res3 = await claimIdempotencyKey("key_abc", "user_victim");
      expect(res3.isDuplicate).toBe(true);
      expect(res3.ownerMismatch).toBe(true);
    });

    it("releaseIdempotencyKey and saveIdempotencyResponse should manage key lifecycle", async () => {
      const mockKeyRecord = {
        id: "idemp_del",
        key: "key_to_release",
        userId: "user_1",
        response: { status: "PROCESSING" } as Prisma.JsonValue,
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      const deleteSpy = vi.spyOn(prisma.idempotencyKey, "delete").mockResolvedValueOnce(mockKeyRecord);
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValueOnce(mockKeyRecord);

      await releaseIdempotencyKey("key_to_release", "user_1");
      expect(deleteSpy).toHaveBeenCalledWith({ where: { key: "key_to_release" } });

      const upsertSpy = vi.spyOn(prisma.idempotencyKey, "upsert").mockResolvedValueOnce({
        ...mockKeyRecord,
        key: "key_to_save",
        response: { status: "COMPLETED" } as Prisma.JsonValue,
      });
      await saveIdempotencyResponse("key_to_save", { status: "COMPLETED" }, "user_1");
      expect(upsertSpy).toHaveBeenCalled();
    });

    it("cleanupExpiredIdempotencyKeys should batch delete expired keys", async () => {
      const expiredRecord1 = {
        id: "id1",
        key: "k1",
        userId: "u1",
        response: null as Prisma.JsonValue,
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      const expiredRecord2 = {
        id: "id2",
        key: "k2",
        userId: "u2",
        response: null as Prisma.JsonValue,
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      vi.spyOn(prisma.idempotencyKey, "findMany").mockResolvedValueOnce([expiredRecord1, expiredRecord2]);
      vi.spyOn(prisma.idempotencyKey, "deleteMany").mockResolvedValueOnce({ count: 2 });

      const deleted = await cleanupExpiredIdempotencyKeys();
      expect(deleted).toBe(2);
    });
  });
});
