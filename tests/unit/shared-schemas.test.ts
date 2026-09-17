import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import {
  campaignDiscoveryItemSchema,
  creatorDiscoveryItemSchema,
  campaignsListResponseSchema,
  creatorsListResponseSchema,
  walletSummarySchema,
  walletTransactionItemSchema,
  walletTransactionsResponseSchema,
  bookmarkRequestSchema,
  storyDealSchema,
  dealsListResponseSchema,
} from "@/lib/schemas";
import { fetcherWithSchema } from "@/lib/fetcher";

describe("Shared Zod Schemas & Runtime Validation", () => {
  describe("campaignDiscoveryItemSchema", () => {
    it("successfully parses a valid campaign discovery item", () => {
      const valid = {
        id: "camp_123",
        title: "Summer Fitness Launch",
        description: "Promoting activewear",
        coverImage: "https://example.com/cover.jpg",
        brandId: "brand_456",
        brandName: "Athleisure Co",
        isBrandGstVerified: true,
        budgetPaise: 5000000,
        perInfluencerBudgetPaise: 50000,
        isEscrowSecured: true,
        niche: "Fitness",
        city: "Mumbai",
      };

      const result = campaignDiscoveryItemSchema.parse(valid);
      expect(result.id).toBe("camp_123");
      expect(result.budgetPaise).toBe(5000000);
      expect(result.isSaved).toBeUndefined();
    });

    it("rejects non-integer budget or missing required fields", () => {
      const invalid = {
        id: "camp_123",
        // missing title
        budgetPaise: "5000 rupees", // string instead of integer paise
      };

      expect(() => campaignDiscoveryItemSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("creatorDiscoveryItemSchema", () => {
    it("successfully parses a valid creator discovery item", () => {
      const valid = {
        id: "creator_789",
        name: "Priya Sharma",
        handle: "priyastyle",
        niche: "Fashion",
        followers: 120000,
        engagementRate: 4.5,
        isKycVerified: true,
        trustScore: 880,
        startingRatePaise: 2500000,
      };

      const result = creatorDiscoveryItemSchema.parse(valid);
      expect(result.handle).toBe("priyastyle");
      expect(result.startingRatePaise).toBe(2500000);
      expect(result.trustScore).toBe(880);
    });

    it("fails fast if trustScore is out of bounds or negative starting rate", () => {
      const invalid = {
        id: "creator_789",
        name: "Priya Sharma",
        handle: "priyastyle",
        followers: 120000,
        engagementRate: 4.5,
        trustScore: 1200, // max is 1000
        startingRatePaise: -100, // min is 0
      };

      expect(() => creatorDiscoveryItemSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("wallet schemas", () => {
    it("validates wallet summary and defaults zero amounts", () => {
      const parsed = walletSummarySchema.parse({
        id: "wallet_1",
        balance: 1500000,
      });

      expect(parsed.balance).toBe(1500000);
      expect(parsed.totalEarned).toBe(0);
      expect(parsed.isFrozen).toBe(false);
    });

    it("transforms Date instances to ISO strings for walletTransactionItemSchema", () => {
      const date = new Date("2026-09-14T12:00:00.000Z");
      const parsed = walletTransactionItemSchema.parse({
        id: "txn_001",
        type: "CREDIT",
        amount: 250000,
        status: "COMPLETED",
        createdAt: date,
      });

      expect(parsed.createdAt).toBe("2026-09-14T12:00:00.000Z");
    });
  });

  describe("bookmarkRequestSchema", () => {
    it("validates bookmark action requests", () => {
      const valid = {
        targetId: "camp_999",
        targetType: "campaign" as const,
        isSaved: true,
      };
      expect(bookmarkRequestSchema.parse(valid)).toEqual(valid);
    });

    it("rejects invalid target types", () => {
      const invalid = {
        targetId: "camp_999",
        targetType: "unknown_entity",
        isSaved: true,
      };
      expect(() => bookmarkRequestSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("fetcherWithSchema (Fail-Fast Runtime Parser)", () => {
    it("returns parsed data when backend shape matches", async () => {
      const mockResponse = {
        id: "deal_123",
        title: "Nike Summer Campaign",
        state: "IN_PROGRESS",
        counterpartyName: "Nike India",
        amount: 5000000,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const data = await fetcherWithSchema("/api/mock-deal", storyDealSchema);
      expect(data.id).toBe("deal_123");
      expect(data.title).toBe("Nike Summer Campaign");
    });

    it("throws ZodError when backend shape drifts or changes unexpectedly", async () => {
      const driftedBackendResponse = {
        // missing id and title
        deal_identifier: "wrong_id_key",
        deal_amount: "5000",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => driftedBackendResponse,
      });

      await expect(
        fetcherWithSchema("/api/mock-deal", storyDealSchema),
      ).rejects.toThrow(ZodError);
    });
  });
});
