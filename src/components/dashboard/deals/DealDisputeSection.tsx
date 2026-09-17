"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, Scale, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui";

export interface DealDisputeSectionProps {
  dealId: string;
  status: string;
  isBrand: boolean;
}

export function DealDisputeSection({ dealId, status, isBrand }: DealDisputeSectionProps) {
  const isDisputed = status === "DISPUTED";
  const isCancelled = status === "CANCELLED";
  const isCompleted = status === "COMPLETED";

  // If deal is in terminal completed or cancelled state, dispute can no longer be raised
  if (isCancelled) {
    return null;
  }

  // 1. ACTIVE DISPUTE STATE: High-visibility Red/Amber Mediation Alert Banner
  if (isDisputed) {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Dispute Under Active Mediation
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Escrow Frozen
              </span>
            </div>
            <p className="text-sm text-amber-800/90 dark:text-amber-300 mt-2 leading-relaxed">
              A formal dispute has been logged for this contract. All escrow funds are frozen
              securely in accordance with VyaparMedia mediation policy. A dedicated admin arbitrator
              is currently reviewing the contract obligations, chat records, and submission timestamps.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                href={`/dashboard/deals/${dealId}/dispute`}
                variant="danger"
                size="sm"
                className="gap-1.5"
              >
                <Scale className="w-4 h-4" />
                View Mediation Case & Evidence
              </Button>
              <Button
                href={`/dashboard/messages?deal=${dealId}`}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                Open Deal Chat
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. NORMAL / ACTIVE STATE: Calm, non-alarmist secondary entry point
  if (!isCompleted) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/70 mb-6 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-secondary/70 shrink-0" />
          <span>
            Need help or facing an unresolved issue with this {isBrand ? "creator" : "brand"}?
          </span>
        </div>
        <Button
          href={`/dashboard/deals/${dealId}/dispute`}
          variant="secondary"
          size="sm"
          className="text-xs border-border/80 hover:bg-muted text-secondary hover:text-foreground shrink-0"
        >
          Resolve Issue / Mediate
        </Button>
      </div>
    );
  }

  return null;
}
