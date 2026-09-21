"use client";

import React from "react";
import { CampaignFormData } from "./CampaignCreateHelpers";
import { formatCurrency, formatDate } from "@/lib/utils-client";
import {
  ShieldCheck,
  Lock,
  Layers,
  Users,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";

interface CampaignSummarySidebarProps {
  readonly formData: CampaignFormData;
}

export function CampaignSummarySidebar({
  formData,
}: CampaignSummarySidebarProps) {
  const slots = formData.maxInfluencers || 1;
  const creatorPayoutPoolPaise = Math.round(formData.totalBudget * 100);

  // Platform escrow fee: 5% of creator payout pool
  const platformFeePaise = Math.round(creatorPayoutPoolPaise * 0.05);
  // GST: 18% on platform fee
  const gstFeePaise = Math.round(platformFeePaise * 0.18);
  // Total Escrow Lock Deposit required
  const totalEscrowRequiredPaise = creatorPayoutPoolPaise + platformFeePaise + gstFeePaise;

  const totalDeliverablesCount = formData.deliverables.reduce(
    (acc, d) => acc + (d.count || 0),
    0
  );

  return (
    <aside
      aria-label="Campaign Escrow Live Summary"
      className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-24"
    >
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-escrow-muted text-escrow border border-escrow-border">
            <Lock className="w-3 h-3" />
            <span>Escrow Estimate</span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Upwork & Kofluence Standard
          </span>
        </div>

        {/* Campaign Title & Categories */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Campaign Brief
          </p>
          <h4 className="text-sm font-black text-foreground line-clamp-2">
            {formData.title.trim() || "Untitled Campaign"}
          </h4>
          {formData.targetCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {formData.targetCategories.slice(0, 3).map((cat, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-foreground"
                >
                  {cat}
                </span>
              ))}
              {formData.targetCategories.length > 3 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                  +{formData.targetCategories.length - 3}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              No categories selected yet
            </p>
          )}
        </div>

        {/* Deliverables & Target Creators */}
        <div className="space-y-2 py-3 border-y border-border text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Deliverables</span>
            </span>
            <span className="font-bold text-foreground tabular-nums">
              {totalDeliverablesCount} items / creator
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Influencer Slots</span>
            </span>
            <span className="font-bold text-foreground tabular-nums">
              {formData.maxInfluencers ? `${formData.maxInfluencers} Creators` : "Open Pool"}
            </span>
          </div>

          {formData.postingDeadline && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Posting Date</span>
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {formatDate(formData.postingDeadline)}
              </span>
            </div>
          )}
        </div>

        {/* Financial Escrow Breakdown */}
        <div className="space-y-2 text-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Financial Escrow Breakdown
          </p>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Creator Payout Pool</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(creatorPayoutPoolPaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>Platform Escrow Fee (5%)</span>
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(platformFeePaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>GST on Platform Fee (18%)</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(gstFeePaise)}
            </span>
          </div>

          {/* Grand Total Escrow Requirement */}
          <div className="pt-3 border-t border-border flex items-baseline justify-between">
            <div>
              <span className="text-xs font-black text-foreground block">
                Total Escrow Lock
              </span>
              <span className="text-[10px] text-muted-foreground">
                100% refundable if unfulfilled
              </span>
            </div>
            <span className="text-lg sm:text-xl font-black text-foreground tabular-nums text-right">
              {formatCurrency(totalEscrowRequiredPaise)}
            </span>
          </div>
        </div>

        {/* High-Trust Escrow Guarantee Box */}
        <div className="p-3 rounded-2xl bg-verified-muted border border-verified-border flex items-start gap-2.5 text-xs text-verified">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-foreground text-[11px]">
              Guaranteed Milestone Protection
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Funds are held securely in an escrow account and released to creators only upon your milestone approval.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
