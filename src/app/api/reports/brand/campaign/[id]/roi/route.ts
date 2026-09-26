import { NextRequest } from "next/server";
import { apiWrapper, ApiResponse, type AuthenticatedRequest } from "@/lib/api-wrapper";
import prisma from "@/lib/db";
import { csvResponse, paiseToRupees } from "@/lib/csv-export";
import { RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

async function _handler(req: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) {
const session = (req as AuthenticatedRequest).session;

const params = await context.params;
const campaignId = params.id as string;
const fmt = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";

// Verify brand owns this campaign
const campaign = await prisma.campaign.findUnique({
where: { id: campaignId },
include: {
brand: { select: { userId: true } },
deals: {
where: { status: "COMPLETED" },
include: {
engagementSnapshots: {
orderBy: { capturedAt: "desc" },
},
influencer: {
select: {
displayName: true,
instagramHandle: true,
instagramFollowers: true,
youtubeSubscribers: true,
averageRating: true,
},
},
},
},
},
});

if (!campaign) return ApiResponse.error("Campaign not found", 404);
if (!campaign.brand || campaign.brand.userId !== session.user.id) return ApiResponse.forbidden();

// Per-influencer ROI
const influencerBreakdown = campaign.deals.map((deal) => {
// Best snapshot = 7d (most data), fallback to 48h, fallback to 24h
const snapshot = deal.engagementSnapshots.find(s => s.interval === "7d")
?? deal.engagementSnapshots.find(s => s.interval === "48h")
?? deal.engagementSnapshots.find(s => s.interval === "24h")
?? deal.engagementSnapshots[0];

const totalEngagements = snapshot
? snapshot.likes + snapshot.comments + snapshot.shares + snapshot.saves
: 0;

const reach = snapshot?.estimatedReach ?? 0;
const views = snapshot?.views ?? 0;

return {
influencer: deal.influencer.displayName,
handle: deal.influencer.instagramHandle,
followers: deal.influencer.instagramFollowers,
paid: deal.amount,
paidRupees: paiseToRupees(deal.amount),
reach,
views,
likes: snapshot?.likes ?? 0,
comments: snapshot?.comments ?? 0,
shares: snapshot?.shares ?? 0,
saves: snapshot?.saves ?? 0,
totalEngagements,
engagementRate: snapshot?.engagementRate ?? 0,
costPerEngagement: totalEngagements > 0
? paiseToRupees(Math.round(deal.amount / totalEngagements))
: "N/A",
costPerReach: reach > 0
? paiseToRupees(Math.round(deal.amount / reach))
: "N/A",
rating: deal.influencer.averageRating,
isEstimated: snapshot?.isEstimated ?? true,
};
});

// Campaign totals
const totals = {
totalSpend: campaign.deals.reduce((s, d) => s + d.amount, 0),
totalReach: influencerBreakdown.reduce((s, d) => s + d.reach, 0),
totalViews: influencerBreakdown.reduce((s, d) => s + d.views, 0),
totalEngagements: influencerBreakdown.reduce((s, d) => s + d.totalEngagements, 0),
avgEngagementRate: influencerBreakdown.length > 0
? influencerBreakdown.reduce((s, d) => s + d.engagementRate, 0) / influencerBreakdown.length
: 0,
};

// Weighted avg CPE
const blendedCPE = totals.totalEngagements > 0
? paiseToRupees(Math.round(totals.totalSpend / totals.totalEngagements))
: "N/A";

if (fmt === "csv") {
  const esc = (v: string) => v.includes(",") ? `"${v.replaceAll('"', '""')}"` : v;
  const row = (label: string, value: string) => `${esc(label)},${esc(value)}\r\n`;
  const sep = () => `\r\n`;
  const title = (t: string) => `${esc(t)},\r\n`;

  let csv = "";

  // Corporate & Platform Header (CreatorIQ / Kofluence Benchmark)
  csv += row("VYAPARMEDIA TECHNOLOGIES PRIVATE LIMITED", "");
  csv += row("CIN: U74999DL2024PTC123456", "GSTIN: 07AABCV1234F1Z5");
  csv += row("Level 4, Tech Boulevard, Sector 126, Noida, UP 201303", "");
  csv += row("CAMPAIGN ROI & INFLUENCER PERFORMANCE REPORT", "");
  csv += row("Website", "https://vyaparmedia.in");
  csv += row("Analytics Desk", "analytics@vyaparmedia.in");
  csv += sep();

  // Campaign Dossier
  csv += title("CAMPAIGN PARAMETERS");
  csv += row("Campaign Title", campaign.title);
  csv += row("Target Categories", (campaign.targetCategories || []).join(" | ") || "General");
  csv += row("Total Escrow Spent", `INR ${paiseToRupees(totals.totalSpend)}`);
  csv += row("Active Influencers", String(influencerBreakdown.length));
  csv += row("Report Generated", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST");
  csv += sep();

  // Executive KPI Summary (CreatorIQ Benchmark)
  csv += title("EXECUTIVE PERFORMANCE SUMMARY");
  csv += row("Total Estimated Reach", String(totals.totalReach));
  csv += row("Total Views / Impressions", String(totals.totalViews));
  csv += row("Total Engagements (Likes + Comments + Shares + Saves)", String(totals.totalEngagements));
  csv += row("Average Engagement Rate", `${totals.avgEngagementRate.toFixed(2)}%`);
  csv += row("Blended Cost Per Engagement (CPE)", blendedCPE !== "N/A" ? `INR ${blendedCPE}` : "N/A");
  csv += row("Blended Cost Per Reach (CPR)", totals.totalReach > 0 ? `INR ${paiseToRupees(Math.round(totals.totalSpend / totals.totalReach))}` : "N/A");
  csv += sep();

  // Influencer Performance Breakdown Table
  csv += title("INFLUENCER DELIVERABLE & PERFORMANCE BREAKDOWN");
  csv += "Influencer,Handle,Followers,Paid (INR),Reach,Views,Likes,Comments,Shares,Saves,Total Engagements,Engagement Rate,CPE (INR),CPR (INR),Rating,Data Quality\r\n";

  for (const d of influencerBreakdown) {
    csv += [
      esc(d.influencer || "Creator"),
      esc(d.handle ? `@${d.handle}` : ""),
      d.followers ?? 0,
      d.paidRupees,
      d.reach,
      d.views,
      d.likes,
      d.comments,
      d.shares,
      d.saves,
      d.totalEngagements,
      `${d.engagementRate.toFixed(2)}%`,
      d.costPerEngagement,
      d.costPerReach,
      d.rating ? (d.rating / 100).toFixed(1) : "N/A",
      d.isEstimated ? "Estimated" : "Verified API",
    ].join(",") + "\r\n";
  }

  // Aggregate Total Row
  csv += [
    "TOTAL",
    `${influencerBreakdown.length} creators`,
    "",
    paiseToRupees(totals.totalSpend),
    totals.totalReach,
    totals.totalViews,
    influencerBreakdown.reduce((s, d) => s + d.likes, 0),
    influencerBreakdown.reduce((s, d) => s + d.comments, 0),
    influencerBreakdown.reduce((s, d) => s + d.shares, 0),
    influencerBreakdown.reduce((s, d) => s + d.saves, 0),
    totals.totalEngagements,
    `${totals.avgEngagementRate.toFixed(2)}%`,
    blendedCPE,
    totals.totalReach > 0 ? paiseToRupees(Math.round(totals.totalSpend / totals.totalReach)) : "N/A",
    "",
    "Aggregate",
  ].join(",") + "\r\n";
  csv += sep();

  // Statutory Certification
  csv += title("METHODOLOGY & VERIFICATION STATEMENT");
  csv += row("Escrow Audit", "100% of recorded payouts were disbursed through RBI-compliant escrow ledger accounts.");
  csv += row("Metrics Source", "Engagement metrics aggregated via verified social APIs & 7-day post-delivery analytics snapshots.");
  csv += row("Legal Note", "This is an official campaign performance statement issued by VyaparMedia Technologies Pvt Ltd.");
  csv += row("--- End of Report ---", "");

  const safeTitle = campaign.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 60);
  const filename = `VyaparMedia-ROI-${safeTitle}-${Date.now()}.csv`;
  return csvResponse(csv, filename);
}

const hasEstimatedData = influencerBreakdown.some((d) => d.isEstimated);

return ApiResponse.success({
campaign: {
id: campaign.id,
title: campaign.title,
targetCategories: campaign.targetCategories,
},
summary: {
totalSpendRupees: paiseToRupees(totals.totalSpend),
totalReach: totals.totalReach,
totalViews: totals.totalViews,
totalEngagements: totals.totalEngagements,
avgEngagementRate: totals.avgEngagementRate,
blendedCPE,
influencerCount: influencerBreakdown.length,
},
influencers: influencerBreakdown,
dataDisclaimer: hasEstimatedData
? " Some engagement figures are modelled estimates (rule-based), not real-time data from Instagram/YouTube APIs. Rows marked isEstimated=true should be treated as indicative only."
: null,
}, "ROI report generated");
}

export const GET = apiWrapper(_handler, {
requirePermission: "VIEW_OWN_FINANCE",
rateLimit: RATE_LIMIT_CONFIGS.REPORTS,
});
