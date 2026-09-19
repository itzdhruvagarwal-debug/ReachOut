"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils-client";
import { CampaignDiscoveryItem } from "./types";
import { apiClient } from "@/lib/api-client";
import {
  ShieldCheck,
  Lock,
  Bookmark,
  Building2,
  Calendar,
  Share2,
  ArrowUpRight,
} from "lucide-react";

interface CampaignDiscoveryCardProps {
  campaign: CampaignDiscoveryItem;
  onToggleBookmark?: (id: string, nextState: boolean) => Promise<void>;
}

export default function CampaignDiscoveryCard({
  campaign,
  onToggleBookmark,
}: Readonly<CampaignDiscoveryCardProps>) {
  const [isSaved, setIsSaved] = useState(Boolean(campaign.isSaved));
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isSaved;
    // 1. Optimistic UI update
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      if (onToggleBookmark) {
        await onToggleBookmark(campaign.id, nextState);
      } else {
        await apiClient.users.toggleBookmark({
          targetId: campaign.id,
          targetType: "campaign",
          isSaved: nextState,
        });
      }

    } catch {
      // 2. Revert on failure with a toast
      setIsSaved(!nextState);
      setToastMessage("Failed to save campaign. Reverted.");
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: `Check out ${campaign.brandName}'s campaign on VyaparMedia`,
          url: window.location.origin + `/dashboard/campaigns/${campaign.id}`,
        });
      } catch {
        // Ignored or user cancelled
      }
    } else {
      navigator.clipboard?.writeText(window.location.origin + `/dashboard/campaigns/${campaign.id}`);
      setToastMessage("Campaign link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const formattedBudget = formatCurrency(campaign.budgetPaise);

  return (
    <article className="relative w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col mb-6 group">
      {/* Toast alert on revert or share */}
      {toastMessage && (
        <div
          role="alert"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
            {campaign.brandAvatar ? (
              <Image
                src={campaign.brandAvatar}
                alt={campaign.brandName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-foreground">
                {campaign.brandName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {campaign.brandName}
              </h4>
              {campaign.isBrandGstVerified && (
                <span
                  title="GST Verified Brand"
                  className="inline-flex items-center text-verified"
                >
                  <ShieldCheck className="w-4 h-4 fill-verified/10" aria-label="GST Verified Brand" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {campaign.city || "Pan-India"}
              </span>
            </div>
          </div>
        </div>

        {/* GST Verified Chip */}
        {campaign.isBrandGstVerified && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-verified-muted text-verified border-verified-border">
            <ShieldCheck className="w-3 h-3" />
            <span>GST Verified</span>
          </span>
        )}
      </div>

      {/* Image-First Media Container (Zero CLS with fixed aspect ratio) */}
      <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden">
        {campaign.coverImage ? (
          <Image
            src={campaign.coverImage}
            alt={campaign.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-card to-muted p-6 text-center">
            <span className="text-3xl mb-2">🎯</span>
            <span className="text-sm font-bold text-foreground/80">{campaign.niche} Campaign</span>
          </div>
        )}

        {/* Upfront Key Trust Signals on Image Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          {campaign.isEscrowSecured && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-escrow-muted/95 text-escrow border-escrow-border shadow-md">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>₹{formattedBudget} Escrow Secured</span>
            </span>
          )}
        </div>

        {/* Category / Niche Pill (Top Right) */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-card/90 text-foreground border border-border/80 shadow-sm">
            {campaign.niche}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 md:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <Link href={`/dashboard/campaigns/${campaign.id}`} className="block focus:outline-none">
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {campaign.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {campaign.description}
            </p>
          </Link>

          {/* Deliverable Tags Row */}
          {campaign.deliverables && campaign.deliverables.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {campaign.deliverables.slice(0, 3).map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground"
                >
                  {item}
                </span>
              ))}
              {campaign.deliverables.length > 3 && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  +{campaign.deliverables.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Metadata & Actions */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Budget Per Creator
            </span>
            <span className="text-base font-extrabold text-foreground tabular-nums">
              {formattedBudget}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share action */}
            <button
              type="button"
              onClick={handleShareClick}
              title="Share Campaign"
              aria-label="Share Campaign"
              className="p-2 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Optimistic Save / Bookmark button */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              disabled={isSaving}
              title={isSaved ? "Remove from saved" : "Save campaign"}
              aria-label={isSaved ? "Remove from saved" : "Save campaign"}
              className={`p-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                isSaved
                  ? "bg-primary text-primary-foreground border-primary scale-105"
                  : "border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
              />
            </button>

            {/* View / Apply CTA */}
            <Link
              href={`/dashboard/campaigns/${campaign.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>View Brief</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
