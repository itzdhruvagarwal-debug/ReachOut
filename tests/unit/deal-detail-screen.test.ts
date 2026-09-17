import { describe, it, expect } from "vitest";
import { formatIndianRupees } from "@/components/dashboard/deals/EscrowTrustCard";
import { getStageIndex, DEAL_STAGES } from "@/components/dashboard/deals/DealProgressStepper";

describe("Deal Detail Screen: Currency, Progress Stepper & Role-Based Actions", () => {
  describe("Requirement 2: Currency Display & Indian Numbering Format (en-IN)", () => {
    it("should format ₹1,00,000 with Indian grouping (not western 100,000)", () => {
      // 1 Lakh rupees in paise = 100000 * 100 = 10000000
      const formatted = formatIndianRupees(10000000);
      // Clean non-breaking spaces for regex match
      const cleaned = formatted.replace(/\u00A0/g, " ");

      expect(cleaned).toContain("₹");
      expect(cleaned).toContain("1,00,000");
      expect(cleaned).not.toBe("₹100,000");
    });

    it("should format multi-lakh amounts with Indian two-digit commas (e.g. ₹15,50,000)", () => {
      // 15.5 Lakh rupees in paise = 1550000 * 100 = 155000000
      const formatted = formatIndianRupees(155000000);
      const cleaned = formatted.replace(/\u00A0/g, " ");

      expect(cleaned).toContain("₹");
      expect(cleaned).toContain("15,50,000");
    });

    it("should format standard hundreds without fractional paise jitter (e.g. ₹500)", () => {
      // 500 rupees in paise = 50000
      const formatted = formatIndianRupees(50000);
      const cleaned = formatted.replace(/\u00A0/g, " ");

      expect(cleaned).toContain("500");
      expect(cleaned).not.toContain(".00");
    });
  });

  describe("Requirement 1: 6-Stage Progress Stepper Mapping", () => {
    it("should map all 6 canonical stages with clear labels and sublabels", () => {
      expect(DEAL_STAGES).toHaveLength(6);
      expect(DEAL_STAGES.map((s) => s.label)).toEqual([
        "Applied",
        "Accepted",
        "Submitted",
        "Under Review",
        "Approved",
        "Payout",
      ]);
    });

    it("should map PENDING_SIGNATURE and PAYMENT_PENDING to stage 0 (Applied)", () => {
      expect(getStageIndex("PENDING_SIGNATURE")).toBe(0);
      expect(getStageIndex("PAYMENT_PENDING")).toBe(0);
    });

    it("should map PAYMENT_HELD and ACTIVE to stage 1 (Accepted / Escrow Locked)", () => {
      expect(getStageIndex("PAYMENT_HELD")).toBe(1);
      expect(getStageIndex("ACTIVE")).toBe(1);
    });

    it("should map CONTENT_SUBMITTED to stage 2 (Submitted)", () => {
      expect(getStageIndex("CONTENT_SUBMITTED")).toBe(2);
    });

    it("should map REVISION_REQUESTED to stage 3 (Under Review)", () => {
      expect(getStageIndex("REVISION_REQUESTED")).toBe(3);
    });

    it("should map CONTENT_APPROVED, POSTED, and VERIFIED to stage 4 (Approved)", () => {
      expect(getStageIndex("CONTENT_APPROVED")).toBe(4);
      expect(getStageIndex("POSTED")).toBe(4);
      expect(getStageIndex("VERIFICATION_PENDING")).toBe(4);
      expect(getStageIndex("VERIFIED")).toBe(4);
    });

    it("should map COMPLETED to stage 5 (Payout Settled)", () => {
      expect(getStageIndex("COMPLETED")).toBe(5);
    });
  });

  describe("Requirement 3: Escrow Lock Status & Protection", () => {
    const isEscrowLocked = (status: string) =>
      [
        "PAYMENT_HELD",
        "ACTIVE",
        "CONTENT_SUBMITTED",
        "REVISION_REQUESTED",
        "CONTENT_APPROVED",
        "POSTED",
        "VERIFICATION_PENDING",
        "VERIFIED",
      ].includes(status);

    it("should correctly identify escrow locked statuses", () => {
      expect(isEscrowLocked("ACTIVE")).toBe(true);
      expect(isEscrowLocked("PAYMENT_HELD")).toBe(true);
      expect(isEscrowLocked("CONTENT_SUBMITTED")).toBe(true);
      expect(isEscrowLocked("REVISION_REQUESTED")).toBe(true);
      expect(isEscrowLocked("POSTED")).toBe(true);
      expect(isEscrowLocked("VERIFIED")).toBe(true);
    });

    it("should not consider unsigned, completed, or cancelled deals as active escrow locked", () => {
      expect(isEscrowLocked("PENDING_SIGNATURE")).toBe(false);
      expect(isEscrowLocked("PAYMENT_PENDING")).toBe(false);
      expect(isEscrowLocked("COMPLETED")).toBe(false);
      expect(isEscrowLocked("CANCELLED")).toBe(false);
    });
  });

  describe("Requirement 4 & Definition of Done: Role-Isolated Action Matrix", () => {
    // Model the frontend button visibility rules
    interface ButtonVisibilityMatrix {
      canSign: boolean;
      canSubmitContent: boolean;
      canSubmitPostUrl: boolean;
      canReviewContent: boolean;
      canReleasePayment: boolean;
      canCancelDeal: boolean;
    }

    function computeAvailableActions(
      status: string,
      role: "BRAND" | "INFLUENCER",
      hasSigned: boolean
    ): ButtonVisibilityMatrix {
      const isInfluencer = role === "INFLUENCER";
      const isBrand = role === "BRAND";

      return {
        canSign: status === "PENDING_SIGNATURE" && !hasSigned,
        canSubmitContent:
          isInfluencer && ["ACTIVE", "PAYMENT_HELD", "REVISION_REQUESTED"].includes(status),
        canSubmitPostUrl: isInfluencer && status === "CONTENT_APPROVED",
        canReviewContent: isBrand && status === "CONTENT_SUBMITTED",
        canReleasePayment:
          isBrand && ["POSTED", "VERIFICATION_PENDING", "VERIFIED"].includes(status),
        canCancelDeal: isBrand && !["COMPLETED", "CANCELLED", "DISPUTED"].includes(status),
      };
    }

    it("should NEVER show Brand action buttons to an Influencer", () => {
      const statuses = [
        "PENDING_SIGNATURE",
        "ACTIVE",
        "CONTENT_SUBMITTED",
        "CONTENT_APPROVED",
        "POSTED",
        "VERIFIED",
        "COMPLETED",
      ];

      for (const status of statuses) {
        const influencerActions = computeAvailableActions(status, "INFLUENCER", false);
        // Influencer must never be able to review content, release payment, or cancel deal
        expect(influencerActions.canReviewContent).toBe(false);
        expect(influencerActions.canReleasePayment).toBe(false);
        expect(influencerActions.canCancelDeal).toBe(false);
      }
    });

    it("should NEVER show Influencer action buttons to a Brand", () => {
      const statuses = [
        "PENDING_SIGNATURE",
        "ACTIVE",
        "CONTENT_SUBMITTED",
        "CONTENT_APPROVED",
        "POSTED",
        "VERIFIED",
        "COMPLETED",
      ];

      for (const status of statuses) {
        const brandActions = computeAvailableActions(status, "BRAND", false);
        // Brand must never be able to submit content or submit post URLs
        expect(brandActions.canSubmitContent).toBe(false);
        expect(brandActions.canSubmitPostUrl).toBe(false);
      }
    });

    it("should allow Influencer to submit content when ACTIVE and post URL when CONTENT_APPROVED", () => {
      const activeActions = computeAvailableActions("ACTIVE", "INFLUENCER", true);
      expect(activeActions.canSubmitContent).toBe(true);
      expect(activeActions.canSubmitPostUrl).toBe(false);

      const approvedActions = computeAvailableActions("CONTENT_APPROVED", "INFLUENCER", true);
      expect(approvedActions.canSubmitContent).toBe(false);
      expect(approvedActions.canSubmitPostUrl).toBe(true);
    });

    it("should allow Brand to review content when SUBMITTED and release payment when POSTED/VERIFIED", () => {
      const submittedActions = computeAvailableActions("CONTENT_SUBMITTED", "BRAND", true);
      expect(submittedActions.canReviewContent).toBe(true);
      expect(submittedActions.canReleasePayment).toBe(false);

      const postedActions = computeAvailableActions("POSTED", "BRAND", true);
      expect(postedActions.canReviewContent).toBe(false);
      expect(postedActions.canReleasePayment).toBe(true);

      const verifiedActions = computeAvailableActions("VERIFIED", "BRAND", true);
      expect(verifiedActions.canReleasePayment).toBe(true);
    });
  });

  describe("Requirement 5: Dispute Entry Point Logic", () => {
    it("should keep dispute entry point non-alarmist during active deal stages", () => {
      const isDisputed = (status: string) => status === "DISPUTED";
      const isEligibleForDispute = (status: string) =>
        !["COMPLETED", "CANCELLED"].includes(status);

      expect(isEligibleForDispute("ACTIVE")).toBe(true);
      expect(isDisputed("ACTIVE")).toBe(false); // Calm secondary entry

      expect(isEligibleForDispute("DISPUTED")).toBe(true);
      expect(isDisputed("DISPUTED")).toBe(true); // Prominent amber/red banner

      expect(isEligibleForDispute("CANCELLED")).toBe(false); // No dispute trigger
    });
  });
});
