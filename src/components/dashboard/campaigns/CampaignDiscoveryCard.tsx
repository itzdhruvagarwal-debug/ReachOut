"use client";

import React from "react";
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
} from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface CampaignDiscoveryCardProps {
  campaign: Campaign;
  isBrand: boolean;
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
}: Readonly<CampaignDiscoveryCardProps>) {
  const maxInfluencers = campaign.maxInfluencers ?? 0;
  const acceptedCount = campaign.acceptedCount ?? 0;
  const fillPercentage =
    maxInfluencers > 0 ? Math.min(100, Math.round((acceptedCount / maxInfluencers) * 100)) : 0;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between group">
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

          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Budget
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-foreground">
              {formatCurrency(campaign.perInfluencerBudget)}
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
                <span className="font-semibold">{fillPercentage}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Posting Deadline & View Brief Action */}
      <div className="pt-4 border-t border-border mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Due {formatDate(campaign.postingDeadline)}</span>
        </div>

        <Button
          href={`/dashboard/campaigns/${campaign.id}`}
          variant="primary"
          size="sm"
          className="font-bold text-xs gap-1 shadow-sm"
          aria-label={`View brief for ${campaign.title}`}
        >
          {isBrand ? "Manage Brief" : "View Brief"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </article>
  );
}
