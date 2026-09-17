"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, ChevronDown, ChevronUp, ExternalLink, IndianRupee } from "lucide-react";
import { formatIndianRupees } from "@/components/dashboard/deals/EscrowTrustCard";

export interface DealContextData {
  id: string;
  title: string;
  amountInPaise: number;
  status: string;
  submissionDeadline?: string | null | undefined;
  brandName?: string | null | undefined;
  creatorName?: string | null | undefined;
}

export interface DealContextMiniCardProps {
  deal: DealContextData | null;
}

export function DealContextMiniCard({ deal }: DealContextMiniCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!deal) return null;

  const isCompleted = deal.status === "COMPLETED";
  const isDisputed = deal.status === "DISPUTED";
  const isEscrowLocked = [
    "PAYMENT_HELD",
    "ACTIVE",
    "CONTENT_SUBMITTED",
    "REVISION_REQUESTED",
    "CONTENT_APPROVED",
    "POSTED",
    "VERIFIED",
  ].includes(deal.status);

  return (
    <div className="border-b border-border/80 bg-muted/40 transition-all">
      {/* Compact Pinned Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shrink-0">
            <Shield className="w-3 h-3" />
            <span>Escrow Protected</span>
          </div>
          <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-xs">
            {deal.title}
          </span>
          <span className="font-extrabold text-foreground tabular-nums font-mono shrink-0">
            {formatIndianRupees(deal.amountInPaise)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <span>View Deal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? "Collapse deal details" : "Expand deal details"}
            className="p-1 text-secondary hover:text-foreground rounded hover:bg-muted cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-border/40 animate-fade-in bg-card/60">
          <div>
            <span className="text-secondary block text-[11px]">Deal Status</span>
            <span className="font-bold text-foreground capitalize">
              {deal.status.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>
          <div>
            <span className="text-secondary block text-[11px]">Escrow State</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {isCompleted
                ? "Payout Released"
                : isDisputed
                ? "Frozen in Dispute"
                : isEscrowLocked
                ? "Locked in Escrow"
                : "Awaiting Signature"}
            </span>
          </div>
          {deal.submissionDeadline && (
            <div>
              <span className="text-secondary block text-[11px]">Deadline</span>
              <span className="font-bold text-foreground">
                {new Date(deal.submissionDeadline).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
