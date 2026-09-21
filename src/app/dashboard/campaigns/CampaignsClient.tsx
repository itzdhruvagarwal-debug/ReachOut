"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import { createSchemaFetcher } from "@/lib/fetcher";
import {
  type DashboardCampaign as Campaign,
  type RawCampaignApiItem as RawCampaign,
  type CampaignsListResponse as CampaignsPayload,
  campaignsListResponseSchema,
} from "@/lib/schemas";
import { normalizeStringArray, normalizeDeliverables } from "@/lib/utils-client";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui";
import { CampaignDiscoveryCard } from "@/components/dashboard/campaigns/CampaignDiscoveryCard";
import { CampaignFiltersBar } from "@/components/dashboard/campaigns/CampaignFiltersBar";
import { ChevronLeft, ChevronRight, PlusCircle, Sparkles } from "lucide-react";

export function buildCampaignQueryParams(
  canCreateCampaign: boolean,
  selectedCategory: string,
  debouncedSearch: string,
  sortBy: string,
  page: number
): string {
  const queryParams = new URLSearchParams();

  if (canCreateCampaign) {
    queryParams.set("scope", "mine");
    queryParams.set("status", "ALL");
  } else {
    queryParams.set("status", "ACTIVE");
  }

  if (selectedCategory !== "All") {
    queryParams.set("category", selectedCategory);
  }

  if (debouncedSearch.trim()) {
    queryParams.set("search", debouncedSearch.trim());
  }

  if (sortBy === "budget_high") {
    queryParams.set("sortBy", "perInfluencerBudget");
    queryParams.set("sortOrder", "desc");
  } else if (sortBy === "budget_low") {
    queryParams.set("sortBy", "perInfluencerBudget");
    queryParams.set("sortOrder", "asc");
  } else if (sortBy === "deadline") {
    queryParams.set("sortBy", "applicationDeadline");
    queryParams.set("sortOrder", "asc");
  } else {
    queryParams.set("sortBy", "createdAt");
    queryParams.set("sortOrder", "desc");
  }

  queryParams.set("page", String(page));
  queryParams.set("limit", "12");

  return queryParams.toString();
}

export function mapRawCampaigns(rawCampaigns: RawCampaign[]): Campaign[] {
  return rawCampaigns.map((campaign: RawCampaign) => ({
    id: campaign.id || "",
    title: campaign.title || "Untitled Campaign",
    description: campaign.description || "",
    createdAt:
      campaign.createdAt instanceof Date
        ? campaign.createdAt.toISOString()
        : campaign.createdAt ?? new Date(0).toISOString(),
    perInfluencerBudget: Number(campaign.perInfluencerBudget || 0),
    minFollowers: Number(campaign.minFollowers || 0),
    postingDeadline: campaign.postingDeadline || new Date(0).toISOString(),
    targetCategories: normalizeStringArray(campaign.targetCategories),
    totalApplications: Number(campaign.totalApplications || campaign._count?.applications || 0),
    brand: {
      companyName: campaign.brand?.companyName || "Verified Brand",
      logo: campaign.brand?.logo || null,
      avgRating: Number(campaign.brand?.avgRating || campaign.brand?.averageRating || 0) / 100,
    },
    deliverables: normalizeDeliverables(campaign.deliverables),
    maxInfluencers: campaign.maxInfluencers ?? null,
    acceptedCount: Array.isArray(campaign.applications) ? campaign.applications.length : 0,
  }));
}

function CampaignGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3.5 bg-muted rounded" />
              <div className="w-40 h-4 bg-muted rounded" />
            </div>
            <div className="w-16 h-6 bg-muted rounded-full" />
          </div>
          <div className="h-10 bg-muted/60 rounded" />
          <div className="flex gap-2">
            <div className="w-16 h-5 bg-muted rounded" />
            <div className="w-20 h-5 bg-muted rounded" />
          </div>
          <div className="h-16 bg-muted/40 rounded-xl" />
          <div className="flex justify-between items-center pt-2">
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="w-24 h-8 bg-muted rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CampaignsClient({
  user,
}: {
  readonly user: { readonly userType?: string };
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const canCreateCampaign = user?.userType === "BRAND";

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const queryString = buildCampaignQueryParams(
    canCreateCampaign,
    selectedCategory,
    debouncedSearch,
    sortBy,
    page
  );

  const campaignsFetcher = createSchemaFetcher(campaignsListResponseSchema);
  const {
    data: payload,
    isLoading: loading,
    error: fetchErr,
  } = useSWR<CampaignsPayload>(`/api/campaigns?${queryString}`, campaignsFetcher);

  const { campaigns, totalPages } = useMemo(() => {
    const rawCampaigns: RawCampaign[] = payload?.data?.campaigns ?? payload?.campaigns ?? [];
    const pages = payload?.data?.totalPages ?? payload?.totalPages ?? 1;
    const mapped = mapRawCampaigns(rawCampaigns);
    return { campaigns: mapped, totalPages: pages };
  }, [payload]);

  const error = fetchErr ? "Unable to load campaigns right now." : null;

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    setPage(1);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {canCreateCampaign ? "My Campaigns" : "Explore Campaigns"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {canCreateCampaign
              ? "Manage your active campaigns, review influencer applications, and fund escrow milestones."
              : "Discover verified brand collaborations matching your niche with guaranteed escrow payouts."}
          </p>
        </div>

        {canCreateCampaign && (
          <Button
            href="/dashboard/campaigns/create"
            variant="primary"
            size="sm"
            className="font-bold text-xs gap-1.5 shadow-sm self-start sm:self-center"
          >
            <PlusCircle className="w-4 h-4" /> Create Campaign
          </Button>
        )}
      </header>

      {/* Filter and Category Bar */}
      <CampaignFiltersBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        sortBy={sortBy}
        setSortBy={handleSortChange}
      />

      {/* Campaign Cards Grid */}
      {loading && <CampaignGridSkeleton />}

      {!loading && error && (
        <EmptyState
          title="Error Loading Campaigns"
          description={error}
          actionLabel="Try Again"
          onActionClick={() => window.location.reload()}
        />
      )}

      {!loading && !error && campaigns.length === 0 && (
        <EmptyState
          title={canCreateCampaign ? "No Campaigns Yet" : "No Campaigns Found"}
          description={
            canCreateCampaign
              ? "You haven't launched any campaigns yet. Create your first campaign to connect with top-ranked creators."
              : "No active campaigns match your search and category filter. Try clearing filters or exploring other niches."
          }
          actionLabel={canCreateCampaign ? "Create New Campaign" : "Reset Filters"}
          actionHref={canCreateCampaign ? "/dashboard/campaigns/create" : undefined}
          onActionClick={
            !canCreateCampaign
              ? () => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }
              : undefined
          }
        />
      )}

      {!loading && !error && campaigns.length > 0 && (
        <>
          <section aria-label="Campaign opportunities" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((campaign) => (
              <CampaignDiscoveryCard
                key={campaign.id}
                campaign={campaign}
                isBrand={canCreateCampaign}
              />
            ))}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Campaigns pagination" className="flex justify-center items-center gap-3 pt-6">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs font-semibold gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="text-xs font-medium text-muted-foreground px-2">
                Page <strong className="text-foreground">{page}</strong> of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-semibold gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
