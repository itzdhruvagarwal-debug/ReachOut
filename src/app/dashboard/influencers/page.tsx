"use client";

import React, { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { createSchemaFetcher } from "@/lib/fetcher";
import {
  creatorsListResponseSchema,
  type CreatorsListResponse,
  type RawInfluencerApiItem,
} from "@/lib/schemas";
import DashboardShell from "@/components/dashboard/DashboardShell";
import EmptyState from "@/components/ui/EmptyState";
import { Button, Input } from "@/components/ui";
import CreatorDiscoveryCard from "@/components/discovery/CreatorDiscoveryCard";
import DiscoveryCardSkeleton from "@/components/discovery/DiscoveryCardSkeleton";
import FilterBottomSheet from "@/components/discovery/FilterBottomSheet";
import {
  type CreatorDiscoveryItem,
  type DiscoveryFilters,
} from "@/components/discovery/types";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Flame,
  Users,
} from "lucide-react";

const CATEGORY_CHIPS = [
  "All",
  "Tech & Gadgets",
  "Fashion & Style",
  "Beauty & Skincare",
  "Fitness & Health",
  "Food & Beverage",
  "Travel & Hospitality",
  "Gaming & Esports",
  "Fintech & Crypto",
];

export function normalizeCreatorItem(inf: RawInfluencerApiItem): CreatorDiscoveryItem {
  const followers =
    inf.followersCount ?? inf.followers ?? inf.instagramFollowers ?? inf.youtubeSubscribers ?? 0;
  const engagement =
    typeof inf.engagementRate === "number"
      ? inf.engagementRate
      : typeof inf.instagramEngagementRate === "number"
      ? Number((inf.instagramEngagementRate / 100).toFixed(2))
      : 3.5;
  const startingRate =
    inf.startingRatePaise ?? (inf.minRate ? inf.minRate * 100 : 1500000);
  const niche =
    inf.niche ||
    inf.category ||
    (inf.categories ? inf.categories.split(",")[0]?.trim() : "Lifestyle") ||
    "Lifestyle";
  const name = inf.displayName || inf.name || inf.user?.name || "Creator";
  const handle =
    inf.handle || inf.instagramHandle || name.toLowerCase().replaceAll(/[^a-z0-9]/g, "_");

  return {
    id: inf.id || inf.userId || "",
    name,
    handle,
    avatar: inf.avatar || inf.user?.image || null,
    coverImage:
      inf.coverImage || inf.topPostImages?.[0] || inf.portfolioImages?.[0] || null,
    niche,
    city: inf.city || inf.state || "India",
    followers,
    engagementRate: Number(engagement.toFixed(1)),
    isKycVerified: Boolean(inf.isKycVerified ?? inf.user?.isKycVerified ?? true),
    trustScore: inf.trustScore ?? inf.user?.trustScore ?? 750,
    startingRatePaise: startingRate,
    isSaved: Boolean(inf.isSaved),
  };
}

export default function DiscoverInfluencersPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilters>({});

  const isBrandOrAdmin =
    session?.user?.userType === "BRAND" || session?.user?.userType === "ADMIN";

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedCategory && selectedCategory !== "All") {
      params.set("category", selectedCategory);
    }
    if (filters.city) params.set("city", filters.city);
    if (typeof filters.minFollowers === "number") {
      params.set("minFollowers", filters.minFollowers.toString());
    }
    if (typeof filters.minBudget === "number") {
      params.set("minRate", Math.round(filters.minBudget / 100).toString());
    }
    if (typeof filters.maxBudget === "number") {
      params.set("maxRate", Math.round(filters.maxBudget / 100).toString());
    }
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    return params;
  }, [search, selectedCategory, filters]);

  const creatorsFetcher = createSchemaFetcher(creatorsListResponseSchema);
  const { data: payload, isLoading: loading } = useSWR<CreatorsListResponse>(
    isBrandOrAdmin ? `/api/influencers?${queryParams.toString()}` : null,
    creatorsFetcher,
    { revalidateOnFocus: false },
  );

  const rawInfluencers: RawInfluencerApiItem[] =
    payload?.influencers || payload?.data?.influencers || [];
  const creators = useMemo(
    () => rawInfluencers.map(normalizeCreatorItem),
    [rawInfluencers],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    if (filters.city) count++;
    if (filters.minFollowers) count++;
    if (filters.minBudget || filters.maxBudget) count++;
    if (filters.sortBy) count++;
    return count;
  }, [selectedCategory, filters]);

  const handleClearAllFilters = useCallback(() => {
    setSearch("");
    setSelectedCategory("All");
    setFilters({});
  }, []);

  if (!session) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!isBrandOrAdmin) {
    return (
      <DashboardShell user={session.user}>
        <div className="max-w-lg mx-auto p-8 rounded-2xl bg-card border border-border text-center mt-12 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-bold text-foreground">
            Brand Access Required
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Influencer discovery, engagement metrics, and rate cards are reserved for verified brand partners. Browse available campaigns instead.
          </p>
          <Button href="/dashboard/campaigns" variant="primary">
            Explore Campaigns
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell user={session.user}>
      <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">

        {/* ── 1. HEADER (INSTAGRAM + COLLABR BENCHMARK) ───────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-foreground">
                Creator Directory
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-verified-muted text-verified border border-verified-border">
                <ShieldCheck className="w-3.5 h-3.5" /> KYC &amp; DRS Verified
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Discover top Indian content creators with audited engagement rates, public rate-cards, and guaranteed escrow protection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFilterSheetOpen(true)}
              className="gap-2 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* ── 2. TRUST HIGHLIGHT RIBBON (COLLABR ANTI-FRAUD GUARANTEE) ─────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40">
            <div className="w-7 h-7 rounded-lg bg-verified-muted text-verified flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">DRS™ Anti-Fraud Audited</span>
              <span className="text-[11px] text-muted-foreground">Bot followers &amp; fake engagement filtered out</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40">
            <div className="w-7 h-7 rounded-lg bg-escrow-muted text-escrow flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">100% Escrow Protection</span>
              <span className="text-[11px] text-muted-foreground">Funds released only after deliverable signoff</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Transparent Rate Cards</span>
              <span className="text-[11px] text-muted-foreground">Pre-negotiated INR pricing with 0 hidden fees</span>
            </div>
          </div>
        </div>

        {/* ── 3. SEARCH BAR & INSTAGRAM CATEGORY CAROUSEL ─────────────────── */}
        <div className="space-y-3.5">
          {/* Live Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search creators by name, Instagram handle, niche, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 text-sm h-11 rounded-2xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontally Scrollable Category Chips Carousel */}
          <nav
            aria-label="Creator category filters"
            className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 text-xs"
          >
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = selectedCategory === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedCategory(chip)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── 4. ACTIVE FILTERS PILL BAR ──────────────────────────────────── */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-muted-foreground font-medium">Active filters:</span>
            {selectedCategory !== "All" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                {selectedCategory}
                <button type="button" onClick={() => setSelectedCategory("All")} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.city && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground font-semibold border border-border">
                City: {filters.city}
                <button type="button" onClick={() => setFilters((p) => ({ ...p, city: undefined }))} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.minFollowers && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground font-semibold border border-border">
                {filters.minFollowers >= 1000 ? `${filters.minFollowers / 1000}K+ Reach` : `${filters.minFollowers}+ Reach`}
                <button type="button" onClick={() => setFilters((p) => ({ ...p, minFollowers: undefined }))} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-muted-foreground hover:text-foreground underline flex items-center gap-1 ml-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          </div>
        )}

        {/* ── 5. CREATOR SHOWCASE GRID (INSTAGRAM + COLLABR CARDS) ────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiscoveryCardSkeleton />
            <DiscoveryCardSkeleton />
            <DiscoveryCardSkeleton />
          </div>
        ) : creators.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="Zero Creators Match Filters"
              description="No creator dossiers match your active category, keyword, or reach filters. Try clearing criteria or exploring other niches."
              actionLabel="Reset All Filters"
              onActionClick={handleClearAllFilters}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <CreatorDiscoveryCard
                key={creator.id}
                creator={creator}
                showInviteButton={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 6. FILTER BOTTOM SHEET MODAL ─────────────────────────────────── */}
      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
        }}
        mode="creators"
      />
    </DashboardShell>
  );
}
