"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils-client";
import { CreatorDiscoveryItem } from "./types";
import { apiClient } from "@/lib/api-client";
import {
  ShieldCheck,
  Bookmark,
  Share2,
  Users,
  Flame,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface CreatorDiscoveryCardProps {
  creator: CreatorDiscoveryItem;
  onToggleBookmark?: (id: string, nextState: boolean) => Promise<void>;
}

export default function CreatorDiscoveryCard({
  creator,
  onToggleBookmark,
}: Readonly<CreatorDiscoveryCardProps>) {
  const [isSaved, setIsSaved] = useState(Boolean(creator.isSaved));
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isSaved;
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      if (onToggleBookmark) {
        await onToggleBookmark(creator.id, nextState);
      } else {
        await apiClient.users.toggleBookmark({
          targetId: creator.id,
          targetType: "creator",
          isSaved: nextState,
        });
      }

    } catch {
      setIsSaved(!nextState);
      setToastMessage("Failed to save creator. Reverted.");
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
          title: creator.name,
          text: `Check out ${creator.name} (@${creator.handle}) on VyaparMedia`,
          url: window.location.origin + `/dashboard/influencers/${creator.id}`,
        });
      } catch {
        // Cancelled
      }
    } else {
      navigator.clipboard?.writeText(window.location.origin + `/dashboard/influencers/${creator.id}`);
      setToastMessage("Creator profile link copied!");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const startingRate = formatCurrency(creator.startingRatePaise);

  return (
    <article className="relative w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col mb-6 group">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="alert"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Creator Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
            {creator.avatar ? (
              <Image
                src={creator.avatar}
                alt={creator.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-foreground">
                {creator.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {creator.name}
              </h4>
              {creator.isKycVerified && (
                <span title="KYC Verified Creator" className="text-verified">
                  <ShieldCheck className="w-4 h-4 fill-verified/15" aria-label="KYC Verified Creator" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              @{creator.handle} • {creator.city || "India"}
            </p>
          </div>
        </div>

        {/* KYC Badge Pill */}
        {creator.isKycVerified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-verified-muted text-verified border-verified-border">
            <ShieldCheck className="w-3 h-3" />
            <span>KYC Verified</span>
          </span>
        )}
      </div>

      {/* Image-First Showcase Container */}
      <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden">
        {creator.coverImage ? (
          <Image
            src={creator.coverImage}
            alt={`${creator.name}'s top content`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-verified/10 via-card to-muted p-6 text-center">
            <span className="text-3xl mb-2">📸</span>
            <span className="text-sm font-bold text-foreground/80">{creator.niche} Creator</span>
          </div>
        )}

        {/* Upfront Trust Score Chip (Top Left) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-card/90 text-foreground border-border/80 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Trust {creator.trustScore}</span>
        </div>

        {/* Niche Badge (Top Right) */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-card/90 text-foreground border border-border/80 shadow-sm">
            {creator.niche}
          </span>
        </div>
      </div>

      {/* Card Content & Metrics Row */}
      <div className="p-4 md:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Metric Badges */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/60 border border-border/60 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Users className="w-3 h-3" />
              <span>Followers</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatFollowers(creator.followers)}
            </span>
          </div>
          <div className="border-x border-border/60">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Flame className="w-3 h-3 text-orange-500" />
              <span>Eng. Rate</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {creator.engagementRate}%
            </span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Starting At
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {startingRate}
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            Verified Escrow Payouts
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareClick}
              title="Share profile"
              aria-label="Share creator profile"
              className="p-2 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleBookmarkClick}
              disabled={isSaving}
              title={isSaved ? "Remove from saved" : "Save creator"}
              aria-label={isSaved ? "Remove from saved" : "Save creator"}
              className={`p-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                isSaved
                  ? "bg-primary text-primary-foreground border-primary scale-105"
                  : "border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            </button>

            <Link
              href={`/dashboard/influencers/${creator.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>View Profile</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
