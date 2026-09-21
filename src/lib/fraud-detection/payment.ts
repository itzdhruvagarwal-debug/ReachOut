import prisma from "../db";
import { logger } from "../logger";
import { decrypt } from "../encryption";
import { checkIsInstagramPostPublic, findPostByUrlDetailed } from "../instagram";
import { extractVideoId, getFreshYouTubeAccessToken, getYouTubeVideoDetailed } from "../youtube";
import {
  TRUST_SCORE_REVIEW_THRESHOLD,
  RAPID_FIRE_WITHDRAWAL_WINDOW_SECONDS,
  RAPID_FIRE_WITHDRAWAL_MAX_COUNT,
  NEW_ACCOUNT_AGE_DAYS_THRESHOLD,
  NEW_ACCOUNT_LARGE_WITHDRAWAL_THRESHOLD_PAISE,
} from "@/constants";
import { FraudCheckResult, FraudFlag, PaymentCheckParams, VerifiedPostData, PostVerificationParams } from "./types";
import {
checkWithdrawalVelocityAndLimits,
checkDuplicatePayoutAccounts,
checkMultipleBankAccounts,
} from "./application";
import {
checkFakePostTiming,
checkEngagementAnomaly,
checkCommentQuality,
} from "./social";

import { getTrustRuleWeights } from "../trust-rules";
import { hasMatchingNameTokens } from "../kyc";
import { redis } from "../redis";

export async function checkPaymentFraud(
  params: PaymentCheckParams,
): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = [];
  let riskScore = 0;

  // Fetch dynamic table-driven rule weights
  const ruleWeights = await getTrustRuleWeights();

  riskScore += await checkWithdrawalVelocityAndLimits(params.userId, params.amount, flags);
  riskScore += await checkDuplicatePayoutAccounts(params.userId, params.bankAccount, params.upiId, flags);
  riskScore += await checkMultipleBankAccounts(params.userId, params.bankAccount, flags);

  // Rule 4: Rapid-fire withdrawals in a 10-minute window
  const recent10mWithdrawals = await prisma.withdrawal.count({
    where: {
      wallet: { userId: params.userId },
      status: { notIn: ["FAILED", "REVERSED"] },
      createdAt: { gte: new Date(Date.now() - RAPID_FIRE_WITHDRAWAL_WINDOW_SECONDS * 1000) },
    },
  });
  if (recent10mWithdrawals >= RAPID_FIRE_WITHDRAWAL_MAX_COUNT) {
    const rapidFireWeight = ruleWeights["FRAUD_RAPID_FIRE_WITHDRAWAL"] ?? 40;
    flags.push({
      rule: "RAPID_FIRE_WITHDRAWAL",
      severity: "HIGH",
      description: `${recent10mWithdrawals} withdrawal attempts detected in the last ${RAPID_FIRE_WITHDRAWAL_WINDOW_SECONDS / 60} minutes`,
    });
    riskScore += rapidFireWeight;
  }

  // Rule 5: Bank account holder name vs verified KYC name mismatch
  if (params.bankAccountName) {
    const [verifiedDoc, user] = await Promise.all([
      prisma.verificationDocument.findFirst({
        where: { userId: params.userId, status: "VERIFIED" },
        select: { metadata: true },
        orderBy: { verifiedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          createdAt: true,
          trustScore: true,
          influencerProfile: { select: { displayName: true } },
          brandProfile: { select: { companyName: true } },
        },
      }),
    ]);

    const docMeta = (verifiedDoc?.metadata as Record<string, unknown>) || {};
    const kycName =
      (typeof docMeta.fullName === "string" ? docMeta.fullName : null) ||
      (typeof docMeta.name === "string" ? docMeta.name : null) ||
      (typeof docMeta.verifiedName === "string" ? docMeta.verifiedName : null) ||
      user?.influencerProfile?.displayName ||
      user?.brandProfile?.companyName;

    if (kycName && !hasMatchingNameTokens(params.bankAccountName, kycName)) {
      const mismatchWeight = ruleWeights["FRAUD_BANK_NAME_KYC_MISMATCH"] ?? 45;
      flags.push({
        rule: "BANK_NAME_KYC_MISMATCH",
        severity: "HIGH",
        description: `Bank account holder name "${params.bankAccountName}" does not match verified KYC/profile name "${kycName}"`,
      });
      riskScore += mismatchWeight;
    }

    if (user) {
      const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (accountAgeDays < NEW_ACCOUNT_AGE_DAYS_THRESHOLD && params.amount > NEW_ACCOUNT_LARGE_WITHDRAWAL_THRESHOLD_PAISE) {
        const newAccountWeight = ruleWeights["FRAUD_LARGE_WITHDRAWAL_NEW_ACCOUNT"] ?? 55;
        flags.push({
          rule: "LARGE_WITHDRAWAL_NEW_ACCOUNT",
          severity: "HIGH",
          description: `Large withdrawal from account less than ${NEW_ACCOUNT_AGE_DAYS_THRESHOLD} days old`,
        });
        riskScore += newAccountWeight;
      }

      if (user.trustScore < TRUST_SCORE_REVIEW_THRESHOLD) {
        const lowTrustWeight = ruleWeights["FRAUD_LOW_TRUST_SCORE_WITHDRAWAL"] ?? 50;
        flags.push({
          rule: "LOW_TRUST_SCORE_WITHDRAWAL",
          severity: "HIGH",
          description: `Trust score ${user.trustScore} below threshold`,
        });
        riskScore += lowTrustWeight;
      }
    }
  } else {
    // Check user age & trust score if bankAccountName wasn't provided
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { createdAt: true, trustScore: true },
    });

    if (user) {
      const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (accountAgeDays < NEW_ACCOUNT_AGE_DAYS_THRESHOLD && params.amount > NEW_ACCOUNT_LARGE_WITHDRAWAL_THRESHOLD_PAISE) {
        const newAccountWeight = ruleWeights["FRAUD_LARGE_WITHDRAWAL_NEW_ACCOUNT"] ?? 55;
        flags.push({
          rule: "LARGE_WITHDRAWAL_NEW_ACCOUNT",
          severity: "HIGH",
          description: `Large withdrawal from account less than ${NEW_ACCOUNT_AGE_DAYS_THRESHOLD} days old`,
        });
        riskScore += newAccountWeight;
      }

      if (user.trustScore < TRUST_SCORE_REVIEW_THRESHOLD) {
        const lowTrustWeight = ruleWeights["FRAUD_LOW_TRUST_SCORE_WITHDRAWAL"] ?? 50;
        flags.push({
          rule: "LOW_TRUST_SCORE_WITHDRAWAL",
          severity: "HIGH",
          description: `Trust score ${user.trustScore} below threshold`,
        });
        riskScore += lowTrustWeight;
      }
    }
  }

  // Rule 6: Device Fingerprint Multi-Account Clustering
  if (params.deviceFingerprint && redis) {
    try {
      const deviceKey = `device_users:${params.deviceFingerprint}`;
      await redis.sadd(deviceKey, params.userId);
      await redis.expire(deviceKey, 30 * 24 * 60 * 60); // 30 days
      const userCount = await redis.scard(deviceKey);
      if (userCount > 1) {
        const deviceClusterWeight = ruleWeights["FRAUD_DEVICE_FINGERPRINT_CLUSTERING"] ?? 50;
        flags.push({
          rule: "DEVICE_FINGERPRINT_CLUSTERING",
          severity: "CRITICAL",
          description: `Device fingerprint associated with ${userCount} distinct user accounts`,
        });
        riskScore += deviceClusterWeight;
      }
    } catch (err) {
      logger.warn("Redis device clustering check error", { error: String(err) });
    }
  }

  // Rule 7: IP Address Cluster
  if (params.ipAddress && params.ipAddress !== "127.0.0.1" && params.ipAddress !== "::1" && redis) {
    try {
      const ipKey = `ip_users:${params.ipAddress}`;
      await redis.sadd(ipKey, params.userId);
      await redis.expire(ipKey, 7 * 24 * 60 * 60); // 7 days
      const ipUserCount = await redis.scard(ipKey);
      if (ipUserCount >= 4) {
        flags.push({
          rule: "IP_CLUSTER_MULTIPLE_ACCOUNTS",
          severity: "HIGH",
          description: `IP address associated with ${ipUserCount} distinct accounts`,
        });
        riskScore += 35;
      }
    } catch (err) {
      logger.warn("Redis IP clustering check error", { error: String(err) });
    }
  }

  // Determine action based on dynamic table-driven thresholds
  const reviewThreshold = ruleWeights["FRAUD_REVIEW_THRESHOLD"] ?? 40;
  const blockThreshold = ruleWeights["FRAUD_BLOCK_THRESHOLD"] ?? 70;

  let action: FraudCheckResult["action"] = "ALLOW";
  if (riskScore >= blockThreshold) action = "BLOCK";
  else if (riskScore >= reviewThreshold) action = "REVIEW";
  else if (riskScore >= 20) action = "FLAG";

  return {
    passed: action === "ALLOW" || action === "FLAG",
    flags,
    riskScore,
    action,
  };
}

export type PostVerificationFetchResult =
  | { status: "FOUND"; data: VerifiedPostData }
  | { status: "CONFIRMED_DELETED"; reason: string }
  | { status: "CHECK_FAILED"; reason: string };

export async function fetchInstagramPostDataDetailed(
  postUrl: string,
  userId?: string,
): Promise<PostVerificationFetchResult> {
  if (!postUrl.includes("instagram.com")) {
    return { status: "CHECK_FAILED", reason: "URL is not an Instagram link" };
  }
  if (!userId) {
    return { status: "CHECK_FAILED", reason: "User ID not provided for Instagram verification" };
  }

  try {
    const oauth = await prisma.oAuthAccount.findFirst({
      where: { userId, provider: "instagram" },
      select: { accessToken: true },
    });
    const decryptedAccessToken = oauth?.accessToken ? decrypt(oauth.accessToken) : null;
    if (!decryptedAccessToken) {
      return {
        status: "CHECK_FAILED",
        reason: "No connected Instagram OAuth account or access token found",
      };
    }

    const igPostResult = await findPostByUrlDetailed(decryptedAccessToken, postUrl);
    if (igPostResult.status === "FOUND") {
      const igPost = igPostResult.post;
      const caption = igPost.caption ?? "";
      return {
        status: "FOUND",
        data: {
          isPublic: await checkIsInstagramPostPublic(igPost.permalink),
          caption,
          isPaidPartnership: igPost.isPaidPartnership ?? false,
          mentions: [...(caption.match(/@(\w+)/g) || [])].map((m) => m.slice(1)),
          hashtags: [...(caption.match(/#(\w+)/g) || [])].map((h) => h.slice(1)),
          postTimestamp: new Date(igPost.timestamp),
          likeCount: igPost.likeCount,
          commentCount: igPost.commentsCount,
        },
      };
    }

    if (igPostResult.status === "NOT_FOUND") {
      return {
        status: "CONFIRMED_DELETED",
        reason: "Instagram post not found in creator's recent media",
      };
    }

    // igPostResult.status === "API_ERROR"
    return {
      status: "CHECK_FAILED",
      reason: igPostResult.error,
    };
  } catch (apiError) {
    logger.warn("Instagram official verification failed", {
      error: apiError instanceof Error ? apiError.message : String(apiError),
    });
    return {
      status: "CHECK_FAILED",
      reason: apiError instanceof Error ? apiError.message : String(apiError),
    };
  }
}

export async function fetchInstagramPostData(
  postUrl: string,
  userId?: string,
): Promise<VerifiedPostData | null> {
  const result = await fetchInstagramPostDataDetailed(postUrl, userId);
  return result.status === "FOUND" ? result.data : null;
}

export async function fetchYouTubePostDataDetailed(
  postUrl: string,
  userId?: string,
): Promise<PostVerificationFetchResult> {
  const youtubeId = extractVideoId(postUrl);
  if (!youtubeId) {
    return { status: "CHECK_FAILED", reason: "Invalid YouTube URL" };
  }

  try {
    let accessToken: string | undefined;
    if (userId) {
      accessToken = (await getFreshYouTubeAccessToken(userId)) ?? undefined;
    }

    const ytResult = await getYouTubeVideoDetailed(youtubeId, accessToken);
    if (ytResult.status === "FOUND") {
      const ytVideo = ytResult.video;
      const isPublic = ytVideo.privacyStatus ? ytVideo.privacyStatus === "public" : true;
      return {
        status: "FOUND",
        data: {
          isPublic,
          isPaidPartnership: false,
          caption: ytVideo.description,
          mentions: [...(ytVideo.description.match(/@([\w.-]+)/g) || [])].map((m) => m.slice(1)),
          hashtags: [...(ytVideo.description.match(/#(\w+)/g) || [])].map((h) => h.slice(1)),
          postTimestamp: new Date(ytVideo.publishedAt),
          likeCount: ytVideo.likeCount,
          commentCount: ytVideo.commentCount,
          viewCount: ytVideo.viewCount,
        },
      };
    }

    if (ytResult.status === "NOT_FOUND") {
      return {
        status: "CONFIRMED_DELETED",
        reason: "YouTube video not found (confirmed gone from YouTube)",
      };
    }

    // ytResult.status === "API_ERROR"
    return {
      status: "CHECK_FAILED",
      reason: ytResult.error,
    };
  } catch (apiError) {
    logger.warn("YouTube official verification failed", {
      error: apiError instanceof Error ? apiError.message : String(apiError),
    });
    return {
      status: "CHECK_FAILED",
      reason: apiError instanceof Error ? apiError.message : String(apiError),
    };
  }
}

export async function fetchYouTubePostData(
  postUrl: string,
  userId?: string,
): Promise<VerifiedPostData | null> {
  const result = await fetchYouTubePostDataDetailed(postUrl, userId);
  return result.status === "FOUND" ? result.data : null;
}

function performPostContentChecks(
verifiedPostData: VerifiedPostData,
params: PostVerificationParams,
flags: FraudFlag[]
): number {
let score = 0;

// Rule 1: Post is private
if (!verifiedPostData.isPublic) {
flags.push({
rule: "POST_IS_PRIVATE",
severity: "CRITICAL",
description: "Post is not publicly visible",
});
score += 100;
}

  // Rule 2: Brand not tagged
  const missingBrandTags = params.requiredTags.filter((tag) => {
    const cleanTag = tag.replace("@", "").toLowerCase();
    const mentionedInList = verifiedPostData.mentions.some((m: string) =>
      m.toLowerCase().includes(cleanTag),
    );
    const mentionedInCaption = verifiedPostData.caption.toLowerCase().includes(cleanTag);
    return !mentionedInList && !mentionedInCaption;
  });

  if (missingBrandTags.length > 0) {
    flags.push({
      rule: "BRAND_NOT_TAGGED",
      severity: "CRITICAL",
      description: `Brand tags missing: ${missingBrandTags.join(", ")}`,
    });
    score += 80;
  }

// Rule 3: Required hashtags missing
const missingHashtags = params.requiredHashtags.filter(
(h: string) =>
!verifiedPostData.hashtags.some(
(sh: string) => sh.toLowerCase() === h.replace("#", "").toLowerCase(),
),
);
if (missingHashtags.length > 0) {
flags.push({
rule: "MISSING_HASHTAGS",
severity: "HIGH",
description: `Missing hashtags: ${missingHashtags.join(", ")}`,
});
score += 60;
}

// Rule 4: #ad / disclosure check
const captionLower = verifiedPostData.caption.toLowerCase();
const hasAdDisclosure =
verifiedPostData.isPaidPartnership === true ||
captionLower.includes("#ad") ||
captionLower.includes("#sponsored") ||
captionLower.includes("#paidpartnership") ||
captionLower.includes("#collab") ||
captionLower.includes("#partnership") ||
captionLower.includes("#paidcollab") ||
captionLower.includes("#gifted");

if (!hasAdDisclosure) {
flags.push({
rule: "NO_AD_DISCLOSURE",
severity: "HIGH",
description:
"Paid partnership disclosure missing required by FTC and Indian ASCI guidelines. " +
"Add #ad, #sponsored, #paidpartnership, #collab, #partnership, #paidcollab, or #gifted, " +
"or enable Instagram's native Paid Partnership label.",
});
score += 70;
}

// Rule 5: Posted after deadline
if (verifiedPostData.postTimestamp > params.postingDeadline) {
const hoursLate = Math.floor(
(verifiedPostData.postTimestamp.getTime() - params.postingDeadline.getTime()) /
(1000 * 60 * 60),
);
flags.push({
rule: "POSTED_LATE",
severity: "HIGH",
description: `Posted ${hoursLate} hour${hoursLate === 1 ? "" : "s"} after deadline requires admin review`,
});
score += 70;
}

return score;
}

export function runVerificationRules(
verifiedPostData: VerifiedPostData,
params: PostVerificationParams,
flags: FraudFlag[]
): number {
let riskScore = 0;

// Ensure isPaidPartnership is always present
verifiedPostData.isPaidPartnership ??= false;

riskScore += performPostContentChecks(verifiedPostData, params, flags);

// Rule 6: Fake post timing check (recycled content or instant submission)
if (params.submissionTimestamp && params.dealAcceptedAt) {
const timingCheck = checkFakePostTiming({
postTimestamp: verifiedPostData.postTimestamp,
submissionTimestamp: params.submissionTimestamp,
dealAcceptedAt: params.dealAcceptedAt,
});

if (!timingCheck.passed) {
flags.push(...timingCheck.flags);
riskScore += timingCheck.riskScore;
}
}

// Rule 7: Engagement anomaly check runs on all deals when engagement data is available
// Data comes from VerifiedPostData (passed through from platform APIs), not caller params.
if (verifiedPostData.likeCount !== undefined) {
const engagementCheck = checkEngagementAnomaly({
followers: params.followerCount ?? 0,
likes: verifiedPostData.likeCount,
comments: verifiedPostData.commentCount ?? 0,
views: verifiedPostData.viewCount ?? 0,
shares: 0,
});
if (!engagementCheck.passed) {
flags.push(...engagementCheck.flags);
riskScore += engagementCheck.riskScore;
}
}

// Rule 8: Comment quality check (informational only, doesn't block)
if (params.comments && params.comments.length > 0) {
const commentCheck = checkCommentQuality(params.comments);
// For comment quality, we only add flags but don't increase risk score (informational)
if (commentCheck.flags.length > 0) {
flags.push(...commentCheck.flags.map(f => ({
...f,
severity: "LOW" as const, // Downgrade to informational
})));
}
}

return riskScore;
}

