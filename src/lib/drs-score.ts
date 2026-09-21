/**
 * Digital Reputation Score (DRS) Calculator
 * Advanced rule-based system for calculating user reputation.
 * Replaces the legacy Trust Score system.
 */

import {
  MIN_TRUST_SCORE,
  MAX_TRUST_SCORE,
  IST_OFFSET_MS,
  DRS_TIER_FLAGGED_MAX,
  DRS_TIER_LIMITED_MAX,
  DRS_TIER_NORMAL_MAX,
  DRS_TIER_TRUSTED_MAX,
  DRS_DEAL_CAP_FLAGGED_PAISE,
  DRS_DEAL_CAP_LIMITED_PAISE,
  DRS_DEAL_CAP_NORMAL_PAISE,
  DRS_DEAL_CAP_TRUSTED_PAISE,
  DRS_DEAL_CAP_ELITE_PAISE,
  DRS_QUALIFIED_DEAL_VALUE_PAISE,
} from "@/constants";

export interface InfluencerDRSFactors {
completedDeals: number;
totalEarningsPaise: number;
fiveStarReviews: number;
onTimeDeliveries: number;
lateDeliveries: number;
poorReviews: number;
contentRejections: number;
disputesLost: number;
disputesWon: number;
identityVerified: boolean;
accountAgeDays: number;
engagementRate: number;
fakeFollowersDetected: boolean;
termsViolations: number;
paymentFraudAttempts: number; // Specifies a permanent ban offense
avgReferralDRS: number; // Average DRS of users referred by this influencer
successfulReferrals: number; // Count of ACTIVE referred users
profileCompleteness: number; // Percentage 0-100
}

export interface DRSResult {
score: number;
tier: "FLAGGED" | "LIMITED" | "NORMAL" | "TRUSTED" | "ELITE";
maxDealAmount: number; // in paise
breakdown: {
factor: string;
impact: number;
reason: string;
}[];
}

/**
 * Clamp DRS score between 0 and 900.
 */
export function clampDRSScore(score: number): number {
  return Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, Math.round(score)));
}

/**
 * Returns UTC timestamp for start of day (00:00:00.000) in Indian Standard Time (IST).
 */
export function getISTStartOfDay(date: Date = new Date()): Date {
  const istOffset = IST_OFFSET_MS;
  const todayIST = new Date(date.getTime() + istOffset);
  todayIST.setUTCHours(0, 0, 0, 0);
  return new Date(todayIST.getTime() - istOffset);
}

export function getDRSTierAndLimit(score: number): {
tier: DRSResult["tier"];
maxDealAmount: number;
} {
if (score <= DRS_TIER_FLAGGED_MAX) {
return { tier: "FLAGGED", maxDealAmount: DRS_DEAL_CAP_FLAGGED_PAISE };
} else if (score < DRS_TIER_LIMITED_MAX) {
return { tier: "LIMITED", maxDealAmount: DRS_DEAL_CAP_LIMITED_PAISE };
} else if (score <= DRS_TIER_NORMAL_MAX) {
return { tier: "NORMAL", maxDealAmount: DRS_DEAL_CAP_NORMAL_PAISE };
} else if (score <= DRS_TIER_TRUSTED_MAX) {
return { tier: "TRUSTED", maxDealAmount: DRS_DEAL_CAP_TRUSTED_PAISE };
} else {
return { tier: "ELITE", maxDealAmount: DRS_DEAL_CAP_ELITE_PAISE };
}
}

function applyInfluencerBonuses(
  factors: InfluencerDRSFactors,
  state: { score: number; breakdown: DRSResult["breakdown"] },
  weights?: Record<string, number>,
) {
  const dealWeight = weights?.DEAL_EXPERIENCE_WEIGHT ?? 15;
  const qualifiedDeals = Math.min(factors.completedDeals, Math.floor(factors.totalEarningsPaise / DRS_QUALIFIED_DEAL_VALUE_PAISE));
  const dealBonus = qualifiedDeals * dealWeight;
  if (dealBonus > 0) {
    state.score += dealBonus;
    state.breakdown.push({
      factor: "Deal Experience",
      impact: dealBonus,
      reason: `${factors.completedDeals} deals completed (${qualifiedDeals} qualified by value)`,
    });
  }

  const reviewWeight = weights?.FIVE_STAR_REVIEW_WEIGHT ?? 30;
  const reviewBonus = factors.fiveStarReviews * reviewWeight;
  if (reviewBonus > 0) {
    state.score += reviewBonus;
    state.breakdown.push({
      factor: "5-Star Quality",
      impact: reviewBonus,
      reason: `${factors.fiveStarReviews} perfect reviews`,
    });
  }

  const onTimeWeight = weights?.ON_TIME_DELIVERY_WEIGHT ?? 18;
  const onTimeBonus = factors.onTimeDeliveries * onTimeWeight;
  if (onTimeBonus > 0) {
    state.score += onTimeBonus;
    state.breakdown.push({
      factor: "Reliability",
      impact: onTimeBonus,
      reason: `${factors.onTimeDeliveries} on-time deliveries`,
    });
  }

  if (factors.identityVerified) {
    const idBonus = weights?.IDENTITY_VERIFIED_WEIGHT ?? 60;
    state.score += idBonus;
    state.breakdown.push({
      factor: "Identity Verified",
      impact: idBonus,
      reason: "Identity verification complete",
    });
  }

  if (factors.accountAgeDays >= 365) {
    const ageBonus = weights?.ACCOUNT_AGE_BONUS ?? 30;
    state.score += ageBonus;
    state.breakdown.push({
      factor: "Account Age",
      impact: ageBonus,
      reason: "Account > 1 year old",
    });
  }

  if (factors.engagementRate >= 3.0) {
    state.score += 60;
    state.breakdown.push({
      factor: "High Engagement",
      impact: 60,
      reason: `Healthy engagement rate detected`,
    });
  }

  if (factors.completedDeals >= 50 && factors.disputesLost === 0) {
    state.score += 90;
    state.breakdown.push({
      factor: "Dispute-Free Record",
      impact: 90,
      reason: `50+ deals with zero lost disputes`,
    });
  }

  const disputeWonWeight = weights?.DISPUTE_WON_BONUS ?? 15;
  const disputeWonBonus = factors.disputesWon * disputeWonWeight;
  if (disputeWonBonus > 0) {
    state.score += disputeWonBonus;
    state.breakdown.push({
      factor: "Disputes Resolved in Favor",
      impact: disputeWonBonus,
      reason: `${factors.disputesWon} disputes resolved in favor`,
    });
  }
}

function applyInfluencerPenalties(
  factors: InfluencerDRSFactors,
  state: { score: number; breakdown: DRSResult["breakdown"] },
  weights?: Record<string, number>,
) {
  if (factors.lateDeliveries > 0) {
    const penaltyWeight = Math.abs(weights?.LATE_DELIVERY_PENALTY ?? 50);
    const penalty = factors.lateDeliveries * penaltyWeight;
    state.score -= penalty;
    state.breakdown.push({
      factor: "Late Deliveries",
      impact: -penalty,
      reason: `${factors.lateDeliveries} late deliveries`,
    });
  }

  if (factors.poorReviews > 0) {
    const penaltyWeight = Math.abs(weights?.POOR_REVIEW_PENALTY ?? 90);
    const penalty = factors.poorReviews * penaltyWeight;
    state.score -= penalty;
    state.breakdown.push({
      factor: "Negative Reviews",
      impact: -penalty,
      reason: `${factors.poorReviews} poor ratings`,
    });
  }

  if (factors.contentRejections > 0) {
    const penaltyWeight = Math.abs(weights?.CONTENT_REJECTION_PENALTY ?? 30);
    const penalty = factors.contentRejections * penaltyWeight;
    state.score -= penalty;
    state.breakdown.push({
      factor: "Content Rejections",
      impact: -penalty,
      reason: `${factors.contentRejections} content rejections`,
    });
  }

  if (factors.disputesLost > 0) {
    const penaltyWeight = Math.abs(weights?.DISPUTE_LOST_PENALTY ?? 180);
    const penalty = factors.disputesLost * penaltyWeight;
    state.score -= penalty;
    state.breakdown.push({
      factor: "Disputes Raised/Lost",
      impact: -penalty,
      reason: `${factors.disputesLost} lost disputes`,
    });
  }

  if (factors.fakeFollowersDetected) {
    const penalty = Math.abs(weights?.FAKE_FOLLOWERS_PENALTY ?? 250);
    state.score -= penalty;
    state.breakdown.push({
      factor: "AI Fraud Detection",
      impact: -penalty,
      reason: "Fake followers anomaly detected",
    });
  }

  if (factors.termsViolations > 0) {
    const penaltyWeight = Math.abs(weights?.TERMS_VIOLATION_PENALTY ?? 450);
    const penalty = factors.termsViolations * penaltyWeight;
    state.score -= penalty;
    state.breakdown.push({
      factor: "Terms Violation",
      impact: -penalty,
      reason: `${factors.termsViolations} TOS violations`,
    });
  }

  if (factors.paymentFraudAttempts > 0) {
    const penalty = Math.abs(weights?.PAYMENT_FRAUD_PENALTY ?? 600);
    state.score -= penalty;
    state.breakdown.push({
      factor: "Fraud Attempt",
      impact: -penalty,
      reason: "Payment fraud triggers permanent ban logic",
    });
  }
}

export function calculateInfluencerDRS(
  factors: InfluencerDRSFactors,
  weights?: Record<string, number>,
): DRSResult {
  const state = {
    score: 600, // Starting score (CIBIL neutral)
    breakdown: [] as DRSResult["breakdown"],
  };

  applyInfluencerBonuses(factors, state, weights);
  applyInfluencerPenalties(factors, state, weights);

  // Cap score 300-900 (CIBIL range)
  const score = Math.max(300, Math.min(900, state.score));

  // Determine Tier
  const { tier, maxDealAmount } = getDRSTierAndLimit(score);

  return { score, tier, maxDealAmount, breakdown: state.breakdown };
}

export interface BrandDRSFactors {
completedCampaigns: number;
fastApprovals: number;
lateApprovals: number;
fairReviews: number;
disputesLost: number;
companyVerified: boolean;
paymentReliability: number;
termsViolations: number;
// Spec additions
longTermPartnerships: number; // Spec: Long-term partnership +5
unfairRejections: number; // Spec: Unfair rejections -10
influencerComplaints: number; // Spec: Influencer complaints -15
}

export function calculateBrandDRS(
  factors: BrandDRSFactors,
  weights?: Record<string, number>,
): DRSResult {
  const breakdown: DRSResult["breakdown"] = [];
  let score = 550; // Brands start at 550 (CIBIL neutral)

  // Activity factor
  const campaignWeight = weights?.BRAND_CAMPAIGN_WEIGHT ?? 18;
  const campaignBonus = factors.completedCampaigns * campaignWeight;
  if (campaignBonus > 0) {
    score += campaignBonus;
    breakdown.push({
      factor: "Campaign History",
      impact: campaignBonus,
      reason: `${factors.completedCampaigns} campaigns completed`,
    });
  }

  // Agility factor
  const approvalWeight = weights?.BRAND_FAST_APPROVAL_WEIGHT ?? 12;
  const approvalBonus = factors.fastApprovals * approvalWeight;
  if (approvalBonus > 0) {
    score += approvalBonus;
    breakdown.push({
      factor: "Fast Approvals",
      impact: approvalBonus,
      reason: `${factors.fastApprovals} quick approvals`,
    });
  }

  // Reliability factor
  if (factors.paymentReliability >= 0.98 && factors.completedCampaigns > 0) {
    const paymentReliabilityBonus = weights?.BRAND_PAYMENT_RELIABILITY_WEIGHT ?? 60;
    score += paymentReliabilityBonus;
    breakdown.push({
      factor: "Payment Reliability",
      impact: paymentReliabilityBonus,
      reason: "High payment success rate",
    });
  }

  if (factors.companyVerified) {
    const verifiedBonus = weights?.BRAND_VERIFIED_WEIGHT ?? 90;
    score += verifiedBonus;
    breakdown.push({
      factor: "Business Verified",
      impact: verifiedBonus,
      reason: "Company registration verified",
    });
  }

  // Long-term partnerships factor
  if (factors.longTermPartnerships > 0) {
    const partnershipWeight = weights?.BRAND_PARTNERSHIP_WEIGHT ?? 30;
    const partnerBonus = factors.longTermPartnerships * partnershipWeight;
    score += partnerBonus;
    breakdown.push({
      factor: "Long-term Partnerships",
      impact: partnerBonus,
      reason: `${factors.longTermPartnerships} repeat influencer relationships`,
    });
  }

  // Fair reviews factor
  if (factors.fairReviews > 0) {
    const reviewWeight = weights?.BRAND_FAIR_REVIEW_WEIGHT ?? 30;
    const fairBonus = factors.fairReviews * reviewWeight;
    score += fairBonus;
    breakdown.push({
      factor: "Fair Reviews",
      impact: fairBonus,
      reason: `${factors.fairReviews} fair reviews given to influencers`,
    });
  }

  // Penalties factor
  if (factors.lateApprovals > 0) {
    const latePenaltyWeight = Math.abs(weights?.BRAND_LATE_APPROVAL_PENALTY ?? -30);
    const penalty = factors.lateApprovals * latePenaltyWeight;
    score -= penalty;
    breakdown.push({
      factor: "Slow Responses",
      impact: -penalty,
      reason: `${factors.lateApprovals} delays in approval`,
    });
  }

  if (factors.unfairRejections > 0) {
    const unfairPenaltyWeight = Math.abs(weights?.BRAND_UNFAIR_REJECTION_PENALTY ?? -120);
    const penalty = factors.unfairRejections * unfairPenaltyWeight;
    score -= penalty;
    breakdown.push({
      factor: "Unfair Rejections",
      impact: -penalty,
      reason: `${factors.unfairRejections} unfair content rejections`,
    });
  }

  if (factors.disputesLost > 0) {
    const disputeLostPenaltyWeight = Math.abs(weights?.BRAND_DISPUTE_LOST_PENALTY ?? -240);
    const penalty = factors.disputesLost * disputeLostPenaltyWeight;
    score -= penalty;
    breakdown.push({
      factor: "Payment Disputes",
      impact: -penalty,
      reason: `${factors.disputesLost} payment disputes`,
    });
  }

  if (factors.influencerComplaints > 0) {
    const complaintPenaltyWeight = Math.abs(weights?.BRAND_COMPLAINT_PENALTY ?? -150);
    const penalty = factors.influencerComplaints * complaintPenaltyWeight;
    score -= penalty;
    breakdown.push({
      factor: "Influencer Complaints",
      impact: -penalty,
      reason: `${factors.influencerComplaints} complaints received`,
    });
  }

  if (factors.termsViolations > 0) {
    const termsPenaltyWeight = Math.abs(weights?.BRAND_TERMS_VIOLATION_PENALTY ?? -600);
    const penalty = factors.termsViolations * termsPenaltyWeight;
    score -= penalty;
    breakdown.push({
      factor: "Terms Violation",
      impact: -penalty,
      reason: `${factors.termsViolations} TOS violations`,
    });
  }

  score = Math.max(300, Math.min(900, score));

  // Determine Tier
  const { tier, maxDealAmount } = getDRSTierAndLimit(score);

  return { score, tier, maxDealAmount, breakdown };
}

const LEVELS = [
{ level: 1, name: "Rookie", minXP: 0 },
{ level: 2, name: "Rising Star", minXP: 101 },
{ level: 3, name: "Creator", minXP: 501 },
{ level: 4, name: "Pro", minXP: 1501 },
{ level: 5, name: "Expert", minXP: 3001 },
{ level: 6, name: "Elite", minXP: 6001 },
{ level: 7, name: "Master", minXP: 10001 },
{ level: 8, name: "Champion", minXP: 20001 },
{ level: 9, name: "Icon", minXP: 40001 },
{ level: 10, name: "Legend", minXP: 75000 },
] as const;

export function calculateLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const lvl = LEVELS[i];
    if (lvl && xp >= lvl.minXP) return lvl;
  }
  return LEVELS[0];
}

// Spec: Higher search ranking + lower platform fees per level
// 10% (base) 9% (level 4+) 8% (level 6+) 7% (level 8+)
export function getPlatformFeePercentage(level: number): number {
if (level >= 8) return 7; // Champion, Icon, Legend
if (level >= 6) return 8; // Elite, Master
if (level >= 4) return 9; // Pro, Expert
return 10; // Rookie, Rising Star, Creator
}
