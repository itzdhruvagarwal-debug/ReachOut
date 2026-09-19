"use client";

import React from "react";
import { ShieldCheck, Lock, CheckCircle2, Info, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils-client";

export interface EscrowTrustCardProps {
  amountInPaise: number;
  totalAmountInPaise?: number | undefined;
  platformFeeInPaise?: number | undefined;
  gatewayFeeInPaise?: number | undefined;
  creatorPayoutInPaise?: number | undefined;
  isEscrowLocked: boolean;
  isCompleted: boolean;
  isDisputed: boolean;
  isCancelled: boolean;
  brandCompanyName?: string | undefined;
  creatorName?: string | undefined;
  isBrand: boolean;
}

/**
 * Formats currency strictly to the Indian numbering system:
 * e.g. 100000 rupees -> ₹1,00,000
 */
export const formatIndianRupees = formatCurrency;

export function EscrowTrustCard({
  amountInPaise,
  totalAmountInPaise,
  platformFeeInPaise = 0,
  gatewayFeeInPaise = 0,
  creatorPayoutInPaise,
  isEscrowLocked,
  isCompleted,
  isDisputed,
  isCancelled,
  brandCompanyName = "Brand",
  creatorName = "Creator",
  isBrand,
}: EscrowTrustCardProps) {
  // Principal deal amount
  const principal = amountInPaise || 0;
  const grossPayable = totalAmountInPaise || (principal + platformFeeInPaise + gatewayFeeInPaise);
  const netCreatorPayout = creatorPayoutInPaise ?? Math.max(0, principal - platformFeeInPaise);

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm mb-6 transition-colors">
      {/* Escrow Status & Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-secondary">
              Escrow Protection
            </span>
            <h3 className="text-base font-bold text-foreground leading-tight">
              VyaparMedia Secured Escrow
            </h3>
          </div>
        </div>

        {/* Status Pill */}
        {isCompleted ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Payout Released
          </div>
        ) : isDisputed ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Lock className="w-3.5 h-3.5" />
            Escrow Frozen (Disputed)
          </div>
        ) : isCancelled ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose/15 text-rose border border-rose/30">
            Escrow Refunded
          </div>
        ) : isEscrowLocked ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Escrow Locked
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/30">
            Pending Escrow Funding
          </div>
        )}
      </div>

      {/* Main Large Currency Display */}
      <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-medium text-secondary">
            {isBrand ? "Total Escrow Secured (Funded by Brand)" : "Guaranteed Deal Value"}
          </span>
          <div
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight tabular-nums mt-1 font-mono"
            style={{ fontFeatureSettings: "'tnum' 1" }}
          >
            {formatIndianRupees(isBrand ? grossPayable : principal)}
          </div>
        </div>

        <div className="flex flex-col sm:items-end">
          <span className="text-xs text-secondary font-medium">
            {isBrand ? "Creator Payout (Net)" : "Your Net Payout"}
          </span>
          <div
            className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono mt-0.5"
            style={{ fontFeatureSettings: "'tnum' 1" }}
          >
            {formatIndianRupees(netCreatorPayout)}
          </div>
          <span className="text-[11px] text-secondary mt-0.5">
            Subject to statutory 194-O TDS reporting
          </span>
        </div>
      </div>

      {/* Itemized Financial Transparency Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/70 text-xs mb-5">
        <div>
          <span className="text-secondary block font-medium">Contract Value</span>
          <span className="font-bold text-foreground tabular-nums text-sm">
            {formatIndianRupees(principal)}
          </span>
        </div>
        <div>
          <span className="text-secondary block font-medium">Platform Fee</span>
          <span className="font-bold text-foreground tabular-nums text-sm">
            {formatIndianRupees(platformFeeInPaise)}
          </span>
        </div>
        <div>
          <span className="text-secondary block font-medium">Gateway & GST</span>
          <span className="font-bold text-foreground tabular-nums text-sm">
            {formatIndianRupees(gatewayFeeInPaise)}
          </span>
        </div>
        <div>
          <span className="text-secondary block font-medium">Settlement Status</span>
          <span className="font-bold text-primary text-sm">
            {isCompleted ? "Transferred" : isEscrowLocked ? "Locked in Escrow" : "Pending Signature"}
          </span>
        </div>
      </div>

      {/* "Funds Are Safe" Core Differentiator Banner */}
      {isEscrowLocked && !isCancelled && (
        <div className="p-4 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/25 text-blue-900 dark:text-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                Funds are 100% Safe & Protected in Escrow
              </h4>
              <p className="text-xs text-blue-800/90 dark:text-blue-300 mt-1 leading-relaxed">
                Money is held in an RBI-compliant escrow account. Neither{" "}
                <span className="font-semibold">{brandCompanyName}</span> nor{" "}
                <span className="font-semibold">{creatorName}</span> can unilaterally withdraw or forfeit
                funds. Payout is released automatically only when deliverables are verified and
                approved according to the contract.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
