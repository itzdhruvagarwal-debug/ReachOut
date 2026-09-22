"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils-client";
import { type DisputeItem, type DisputesResponse } from "@/lib/schemas/dispute.schema";
import {
  Scale,
  ShieldAlert,
  ArrowRight,
  Search,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  User,
  ArrowLeft,
  HelpCircle,
  AlertTriangle,
  Paperclip,
} from "lucide-react";

type FilterTab = "all" | "active" | "resolved";

function DisputeSkeleton() {
  return (
    <div className="space-y-4">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <Skeleton width="40%" height={14} borderRadius={4} />
            <Skeleton width="60%" height={24} borderRadius={6} />
          </div>
        ))}
      </div>

      {/* Disputes List Skeleton */}
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Skeleton width={100} height={24} borderRadius={12} />
                <Skeleton width={70} height={24} borderRadius={12} />
              </div>
              <Skeleton width={90} height={24} borderRadius={12} />
            </div>
            <Skeleton width="70%" height={22} borderRadius={4} />
            <div className="flex gap-4">
              <Skeleton width={120} height={16} borderRadius={4} />
              <Skeleton width={120} height={16} borderRadius={4} />
            </div>
            <Skeleton width="100%" height={56} borderRadius={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineStepProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
  isLast?: boolean;
}

function TimelineStep({ label, isComplete, isActive, isLast = false }: TimelineStepProps) {
  return (
    <div className="flex items-center flex-1 last:flex-none">
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
            isComplete
              ? "bg-verified text-white"
              : isActive
              ? "bg-pending text-white animate-pulse"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
          {!isComplete && isActive ? <Clock className="w-3.5 h-3.5" /> : null}
          {!isComplete && !isActive ? "•" : null}
        </div>
        <span
          className={`text-xs font-medium ${
            isActive
              ? "text-foreground font-semibold"
              : isComplete
              ? "text-muted-foreground"
              : "text-muted-foreground/60"
          }`}
        >
          {label}
        </span>
      </div>
      {!isLast && (
        <div
          className={`h-0.5 flex-1 mx-2 transition-colors ${
            isComplete ? "bg-verified" : "bg-border"
          }`}
        />
      )}
    </div>
  );
}

function getDisputeCountdown(createdAtStr: string): string {
  try {
    const created = new Date(createdAtStr).getTime();
    const deadline = created + 48 * 60 * 60 * 1000;
    const diffMs = deadline - Date.now();
    if (diffMs <= 0) return "SLA Expired";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  } catch {
    return "48h window";
  }
}

function DisputeTimeline({ status }: { status: string }) {
  const isResolvedOrClosed = status === "RESOLVED" || status === "CLOSED";
  const isTier2 = status === "TIER2_MEDIATION";
  const isOpenOrTier1 = status === "OPEN" || status === "TIER1_AUTO";

  const step1Complete = true; // Filed is always complete
  const step2Complete = isTier2 || isResolvedOrClosed;
  const step2Active = isOpenOrTier1;

  const step3Complete = isResolvedOrClosed;
  const step3Active = isTier2;

  const step4Complete = isResolvedOrClosed;
  const step4Active = false;

  return (
    <div className="hidden sm:flex items-center py-2 px-3 bg-muted/40 rounded-xl border border-border/60">
      <TimelineStep label="Filed" isComplete={step1Complete} isActive={false} />
      <TimelineStep
        label="Mutual Talk"
        isComplete={step2Complete}
        isActive={step2Active}
      />
      <TimelineStep
        label="Escrow Mediation"
        isComplete={step3Complete}
        isActive={step3Active}
      />
      <TimelineStep
        label="Resolution"
        isComplete={step4Complete}
        isActive={step4Active}
        isLast
      />
    </div>
  );
}

export default function DisputesPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useSWR<DisputesResponse>("/api/disputes", fetcher);
  const disputes = useMemo(() => data?.disputes || [], [data?.disputes]);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic
  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      // Tab filter
      if (activeTab === "active") {
        const isActive =
          dispute.status === "OPEN" ||
          dispute.status === "TIER1_AUTO" ||
          dispute.status === "TIER2_MEDIATION";
        if (!isActive) return false;
      } else if (activeTab === "resolved") {
        const isResolved = dispute.status === "RESOLVED" || dispute.status === "CLOSED";
        if (!isResolved) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const campaignTitle = dispute.deal?.campaign?.title?.toLowerCase() || "";
      const caseId = dispute.id.toLowerCase();
      const influencerName =
        dispute.deal?.influencer?.displayName?.toLowerCase() ||
        dispute.deal?.influencer?.name?.toLowerCase() ||
        "";
      const brandName =
        dispute.deal?.brand?.companyName?.toLowerCase() ||
        dispute.deal?.brand?.name?.toLowerCase() ||
        "";

      return (
        campaignTitle.includes(q) ||
        caseId.includes(q) ||
        influencerName.includes(q) ||
        brandName.includes(q)
      );
    });
  }, [disputes, activeTab, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = disputes.length;
    let activeMediationCount = 0;
    let resolvedCount = 0;
    let totalDisputedAmount = 0;

    for (const d of disputes) {
      if (
        d.status === "OPEN" ||
        d.status === "TIER1_AUTO" ||
        d.status === "TIER2_MEDIATION"
      ) {
        activeMediationCount++;
      } else if (d.status === "RESOLVED" || d.status === "CLOSED") {
        resolvedCount++;
      }
      totalDisputedAmount += d.deal?.amount || 0;
    }

    return {
      totalCount,
      activeMediationCount,
      resolvedCount,
      totalDisputedAmount,
    };
  }, [disputes]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "TIER1_AUTO":
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pending-muted text-pending border border-pending-border">
            <Clock className="w-3.5 h-3.5" />
            Tier 1: Mutual Negotiation
          </span>
        );
      case "TIER2_MEDIATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-disputed-muted text-disputed border border-disputed-border animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            Tier 2: Escrow Mediation
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-verified-muted text-verified border border-verified-border">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            {status.replaceAll("_", " ")}
          </span>
        );
    }
  };

  return (
    <DashboardShell user={session?.user}>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/deals"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Deals
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <Scale className="w-7 h-7 text-primary" />
              Dispute & Resolution Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Escrow-backed dispute arbitration, evidence examination, and neutral mediation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              Resolution Guide
            </Link>
            <Link
              href="/dashboard/deals"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm transition-colors"
            >
              Active Deals
            </Link>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground block mb-1">
              Total Disputes
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tabular-nums">
                {metrics.totalCount}
              </span>
              <span className="text-xs text-muted-foreground">cases recorded</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-medium text-pending block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              In Mediation
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tabular-nums">
                {metrics.activeMediationCount}
              </span>
              <span className="text-xs text-pending font-medium">awaiting action</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-medium text-verified block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resolved & Closed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tabular-nums">
                {metrics.resolvedCount}
              </span>
              <span className="text-xs text-verified font-medium">settled</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Disputed Escrow
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                {formatCurrency(metrics.totalDisputedAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Cases ({metrics.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "active"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                In Mediation
                {metrics.activeMediationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-pending text-white text-[10px]">
                    {metrics.activeMediationCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("resolved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "resolved"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Resolved ({metrics.resolvedCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search campaign, case #, or party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {(() => {
          if (isLoading) {
            return <DisputeSkeleton />;
          }

          if (disputes.length === 0) {
            return (
              <EmptyState
                emoji="🛡️"
                title="No Open Disputes"
                description="All your escrow deals are running smoothly with zero disputes or hold-ups."
                actionLabel="View Active Deals"
                actionHref="/dashboard/deals"
              />
            );
          }

          if (filteredDisputes.length === 0) {
            return (
              <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-pending mx-auto" />
                <h3 className="text-base font-bold text-foreground">No Disputes Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No dispute cases match your current search query or filter tab.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => {
                const caseNumber = dispute.id.slice(-6).toUpperCase();
                const influencerName =
                  dispute.deal?.influencer?.displayName ||
                  dispute.deal?.influencer?.name ||
                  "Creator";
                const brandName =
                  dispute.deal?.brand?.companyName ||
                  dispute.deal?.brand?.name ||
                  "Brand";

                return (
                  <div
                    key={dispute.id}
                    className="bg-card border border-border hover:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Top Row: Case ID, Status, Escrow Amount, Type */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                          #CASE-{caseNumber}
                        </span>
                        {getStatusBadge(dispute.status)}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          {dispute.type} Issue
                        </span>
                        {/* Evidence Status Pill */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                          <Paperclip className="w-3 h-3 text-primary" />
                          Evidence Vault Active
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Urgency Badge */}
                        {dispute.status === "OPEN" || dispute.status === "TIER1_AUTO" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pending bg-pending-muted px-2.5 py-1 rounded-full border border-pending-border">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Mutual Window: {getDisputeCountdown(dispute.createdAt)}
                          </span>
                        ) : dispute.status === "TIER2_MEDIATION" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-disputed bg-disputed-muted px-2.5 py-1 rounded-full border border-disputed-border animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            Urgent: Arbiter Reviewing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-verified bg-verified-muted px-2.5 py-1 rounded-full border border-verified-border">
                            <CheckCircle2 className="w-3 h-3" />
                            Settlement Disbursed
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 tabular-nums">
                          <Lock className="w-3.5 h-3.5" />
                          {formatCurrency(dispute.deal?.amount || 0)} Protected
                        </span>
                      </div>
                    </div>

                    {/* Resolution Timeline Progress */}
                    <DisputeTimeline status={dispute.status} />

                    {/* Middle Section: Campaign Info & Parties */}
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                        <Link href={`/dashboard/disputes/${dispute.id}`}>
                          {dispute.deal?.campaign?.title || "Campaign Deal"}
                        </Link>
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <strong className="text-foreground font-semibold">Brand:</strong>{" "}
                          {brandName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <strong className="text-foreground font-semibold">Creator:</strong>{" "}
                          {influencerName}
                        </span>
                        <span className="text-muted-foreground/60">
                          Deal #{dispute.deal?.id?.slice(-6)?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Party Claim Amounts (Upwork / Fiverr Dispute Benchmark) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
                      <div className="flex items-center justify-between px-2 sm:border-r sm:border-border/60">
                        <span className="text-muted-foreground text-[11px]">Brand Claim:</span>
                        <span className="font-semibold font-mono text-pending">
                          Full Refund ({formatCurrency(dispute.deal?.amount || 0)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2">
                        <span className="text-muted-foreground text-[11px]">Creator Claim:</span>
                        <span className="font-semibold font-mono text-verified">
                          Full Escrow Release ({formatCurrency(dispute.deal?.amount || 0)})
                        </span>
                      </div>
                    </div>

                    {/* Description Excerpt Quote */}
                    <div className="bg-background/80 border border-border/80 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed italic">
                      "{dispute.description.length > 180
                        ? dispute.description.slice(0, 180) + "..."
                        : dispute.description}"
                    </div>

                    {/* Bottom Row: Timestamp and Action CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        Filed on {formatDate(dispute.createdAt)}
                      </span>

                      <Link
                        href={`/dashboard/disputes/${dispute.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-sm hover:translate-x-0.5 transition-all"
                      >
                        Enter Dispute Room
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </DashboardShell>
  );
}
