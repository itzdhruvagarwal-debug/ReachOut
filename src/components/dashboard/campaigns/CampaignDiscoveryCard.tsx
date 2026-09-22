"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { type DashboardCampaign as Campaign } from "@/lib/schemas";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils-client";
import {
  ShieldCheck,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Lock,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface CampaignDiscoveryCardProps {
  campaign: Campaign;
  isBrand: boolean;
  isApplied?: boolean;
}

const deliverableLabels: Record<string, string> = {
  INSTAGRAM_POST: "IG Post",
  INSTAGRAM_REEL: "IG Reel",
  INSTAGRAM_STORY: "IG Story",
  YOUTUBE_VIDEO: "YT Video",
  YOUTUBE_SHORT: "YT Short",
  TWITTER_POST: "X Post",
  LINKEDIN_POST: "LinkedIn",
};

export function CampaignDiscoveryCard({
  campaign,
  isBrand,
  isApplied,
}: Readonly<CampaignDiscoveryCardProps>) {
  const maxInfluencers = campaign.maxInfluencers ?? 0;
  const acceptedCount = campaign.acceptedCount ?? 0;
  const fillPercentage =
    maxInfluencers > 0 ? Math.min(100, Math.round((acceptedCount / maxInfluencers) * 100)) : 0;
  const remainingSlots = maxInfluencers > 0 ? Math.max(0, maxInfluencers - acceptedCount) : null;
  const isSlotsUrgent = fillPercentage >= 80 && remainingSlots !== null && remainingSlots > 0;

  const daysLeft = useMemo(() => {
    if (!campaign.postingDeadline) return null;
    const due = new Date(campaign.postingDeadline).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }, [campaign.postingDeadline]);

  const isDeadlineUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between group relative overflow-hidden ${
        isApplied
          ? "border-verified/50 bg-card hover:border-verified"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="space-y-3.5">
        {/* Top: Brand Info & Commercial Budget */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center text-foreground font-bold text-sm">
              {campaign.brand.logo ? (
                <Image
                  src={campaign.brand.logo}
                  alt={campaign.brand.companyName}
                  fill
                  className="object-cover"
                />
              ) : (
                <span>{campaign.brand.companyName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/90 truncate max-w-[130px]">
                  {campaign.brand.companyName}
                </span>
                {campaign.brand.avgRating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pending">
                    <Star className="w-3 h-3 fill-current" />
                    {campaign.brand.avgRating.toFixed(1)}
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-verified">
                <ShieldCheck className="w-3 h-3" /> Verified Brand
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            {isApplied && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-verified text-primary-foreground shadow-xs">
                <CheckCircle2 className="w-3 h-3" /> Applied
              </span>
            )}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Budget
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-foreground">
                {formatCurrency(campaign.perInfluencerBudget)}
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Title & Description */}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {campaign.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
            {campaign.description || "Exciting brand collaboration with escrow protected milestone payouts."}
          </p>
        </div>

        {/* Deliverables & Category Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {campaign.deliverables.slice(0, 3).map((item, index) => (
            <Badge
              key={`${campaign.id}-del-${index}`}
              variant="primary"
              className="text-[10px] font-bold py-0.5 px-2"
            >
              {item.count}× {deliverableLabels[item.type] || item.type.replaceAll("_", " ")}
            </Badge>
          ))}
          {campaign.targetCategories.slice(0, 2).map((category) => (
            <span
              key={`${campaign.id}-${category}`}
              className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Urgency badges (Kofluence / Collabr scarcity pattern) */}
        {(isSlotsUrgent || isDeadlineUrgent) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {isSlotsUrgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-pending-muted text-pending border border-pending-border">
                🔥 {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"} left
              </span>
            )}
            {isDeadlineUrgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-disputed-muted text-disputed border border-disputed-border">
                ⏰ {daysLeft === 1 ? "Ends today" : `${daysLeft} days left`}
              </span>
            )}
          </div>
        )}

        {/* Telemetry Metrics & Slot Progress Bar (Kofluence Style) */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] font-medium text-muted-foreground">Followers</div>
              <div className="text-xs font-extrabold text-foreground font-mono tabular-nums">
                {campaign.minFollowers > 0 ? `${formatNumber(campaign.minFollowers)}+` : "Open"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-muted-foreground">Applications</div>
              <div className="text-xs font-extrabold text-foreground font-mono tabular-nums">
                {campaign.totalApplications}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-muted-foreground">Slots</div>
              <div className="text-xs font-extrabold text-foreground font-mono tabular-nums">
                {maxInfluencers > 0 ? `${acceptedCount}/${maxInfluencers}` : "Unlimited"}
              </div>
            </div>
          </div>

          {/* Slots progress bar if capped */}
          {maxInfluencers > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Slots Filled</span>
                <span className={`font-semibold ${isSlotsUrgent ? "text-pending font-bold" : ""}`}>
                  {isSlotsUrgent ? `🔥 Only ${remainingSlots} left (${fillPercentage}%)` : `${fillPercentage}%`}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSlotsUrgent ? "bg-pending" : "bg-primary"
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Posting Deadline & View Brief Action */}
      <div className="pt-4 border-t border-border mt-4 flex items-center justify-between gap-3">
        <div className={`flex items-center gap-1.5 text-xs ${isDeadlineUrgent ? "text-disputed font-semibold" : "text-muted-foreground"}`}>
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isDeadlineUrgent
              ? `Due ${formatDate(campaign.postingDeadline)} (Closing Soon)`
              : `Due ${formatDate(campaign.postingDeadline)}`}
          </span>
        </div>

        <Button
          href={`/dashboard/campaigns/${campaign.id}`}
          variant={isApplied ? "secondary" : "primary"}
          size="sm"
          className="font-bold text-xs gap-1 shadow-sm"
          aria-label={`View brief for ${campaign.title}`}
        >
          {isApplied ? "View Application" : isBrand ? "Manage Brief" : "View Brief"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </article>
  );
}
