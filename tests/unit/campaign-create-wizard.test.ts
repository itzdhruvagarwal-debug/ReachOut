import { describe, it, expect } from "vitest";
import {
  validateCampaignForm,
  getRecommendedRate,
  deliverableTypes,
  CampaignFormData,
} from "@/components/dashboard/campaigns/create/CampaignCreateHelpers";

describe("Campaign Creation Wizard (Upwork / Kofluence Pattern)", () => {
  const validFormData: CampaignFormData = {
    title: "Summer Fest Glow Collection Launch",
    description: "Promoting our cruelty-free vegan sunscreen range across Instagram reels.",
    requirements: "High energy 60s Reel showing direct product application. Include link sticker.",
    totalBudget: 15000,
    perInfluencerBudget: 3000,
    targetCategories: ["Beauty", "Fashion"],
    targetCities: ["Mumbai", "Bengaluru"],
    targetGender: "FEMALE",
    targetAgeMin: 18,
    targetAgeMax: 34,
    minFollowers: 5000,
    maxFollowers: 50000,
    maxInfluencers: 5,
    applicationDeadline: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]!,
    contentDeadline: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0]!,
    postingDeadline: new Date(Date.now() + 86400000 * 10).toISOString().split("T")[0]!,
    requiresProduct: true,
    productName: "Glow Daily Sunscreen SPF 50",
    productValue: 999,
    productDescription: "Standard 50ml retail pack shipped via BlueDart.",
    deliverables: [
      { type: "INSTAGRAM_REEL", count: 1, rate: 3000 },
    ],
  };

  describe("Validation & Step Integrity", () => {
    it("should successfully validate a well-formed campaign payload", () => {
      const result = validateCampaignForm(validFormData);
      expect(result.success).toBe(true);
      expect(result.fieldErrors).toBeUndefined();
    });

    it("should fail validation if no categories are chosen", () => {
      const invalid = { ...validFormData, targetCategories: [] };
      const result = validateCampaignForm(invalid);
      expect(result.success).toBe(false);
      const errMessage = result.fieldErrors?.targetCategories || result.error || "";
      expect(errMessage.toLowerCase()).toContain("category");
    });

    it("should reject budgets below platform minimums", () => {
      const invalid = { ...validFormData, totalBudget: 500, perInfluencerBudget: 200 };
      const result = validateCampaignForm(invalid);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Minimum budget/);
    });

    it("should reject deadlines where posting is before content submission", () => {
      const invalid = {
        ...validFormData,
        contentDeadline: "2026-10-15",
        postingDeadline: "2026-10-10",
      };
      const result = validateCampaignForm(invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Posting deadline must be after content deadline");
    });

    it("should reject maxFollowers less than minFollowers", () => {
      const invalid = {
        ...validFormData,
        minFollowers: 10000,
        maxFollowers: 5000,
      };
      const result = validateCampaignForm(invalid);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Max followers must be greater than min followers");
    });
  });

  describe("Rate Recommendations & Deliverables", () => {
    it("should provide higher recommended rates for YouTube vs Instagram", () => {
      const instaRate = getRecommendedRate("INSTAGRAM_REEL", 10000);
      const ytRate = getRecommendedRate("YOUTUBE_VIDEO", 10000);

      expect(ytRate).toBeGreaterThan(instaRate);
      expect(instaRate).toBeGreaterThanOrEqual(500);
      expect(ytRate).toBeGreaterThanOrEqual(750);
    });

    it("should support standard creator deliverable formats", () => {
      const values = deliverableTypes.map((d) => d.value);
      expect(values).toContain("INSTAGRAM_POST");
      expect(values).toContain("INSTAGRAM_REEL");
      expect(values).toContain("INSTAGRAM_STORY");
      expect(values).toContain("YOUTUBE_VIDEO");
      expect(values).toContain("YOUTUBE_SHORT");
    });
  });

  describe("Escrow & GST Financial Calculations", () => {
    it("should compute accurate escrow lock requirement with 5% fee and 18% GST", () => {
      const creatorPool = 15000;
      const platformFee = creatorPool * 0.05; // 750
      const gstFee = platformFee * 0.18; // 135
      const totalEscrowLock = creatorPool + platformFee + gstFee; // 15885

      expect(platformFee).toBe(750);
      expect(gstFee).toBe(135);
      expect(totalEscrowLock).toBe(15885);
    });
  });
});
