"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, ChevronDown, ChevronUp, ExternalLink, Lock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils-client";

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

export function DealContextMiniCard({ deal }: Readonly<DealContextMiniCardProps>) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!deal) return null;

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
    <aside aria-label="Pinned escrow deal summary" className="border-b border-border bg-card/80 transition-all">
      {/* Compact Pinned Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-escrow-muted text-escrow border border-escrow-border font-bold shrink-0">
            <Lock className="w-3 h-3" />
            <span>Escrow Protected</span>
          </div>
          <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-xs">
            {deal.title}
          </span>
          <span className="font-extrabold text-foreground tabular-nums font-mono shrink-0">
            {formatCurrency(deal.amountInPaise)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            <span>Deal Room</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? "Collapse deal details" : "Expand deal details"}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1.5 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-border bg-muted/30">
          <div>
            <span className="text-muted-foreground block text-[11px]">Deal Status</span>
            <span className="font-bold text-foreground capitalize">
              {deal.status.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Escrow State</span>
            <span className="font-bold text-foreground">
              {isDisputed
                ? "Frozen in Dispute"
                : isEscrowLocked
                ? "Locked in Escrow"
                : "Awaiting Signature"}
            </span>
          </div>
          {deal.submissionDeadline && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Deadline</span>
              <span className="font-bold text-foreground">
                {formatDate(deal.submissionDeadline, "-", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
