"use client";

import React, { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  HelpCircle,
} from "lucide-react";
import { Input, Card } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils-client";
import type { WalletTransactionItem } from "@/lib/schemas";

export type TransactionItem = WalletTransactionItem;

interface VirtualizedTransactionListProps {
  transactions: TransactionItem[];
  isLoading: boolean;
  onRefresh?: () => void;
  onSelectTransaction?: (transaction: TransactionItem) => void;
}

const CREDIT_TYPES = new Set(["CREDIT", "REFUND"]);
const DEBIT_TYPES = new Set(["DEBIT", "WITHDRAWAL", "PLATFORM_FEE", "CLAWBACK", "CHARGEBACK"]);

export function VirtualizedTransactionList({
  transactions,
  isLoading,
  onRefresh,
  onSelectTransaction,
}: VirtualizedTransactionListProps) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CREDIT" | "DEBIT" | "PENDING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Filter tab
      if (activeFilter === "CREDIT" && !CREDIT_TYPES.has(tx.type)) return false;
      if (activeFilter === "DEBIT" && !DEBIT_TYPES.has(tx.type)) return false;
      if (activeFilter === "PENDING" && tx.status !== "PENDING") return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (tx.description || "").toLowerCase().includes(query);
        const idMatch = tx.id.toLowerCase().includes(query);
        const typeMatch = tx.type.toLowerCase().includes(query);
        return descMatch || idMatch || typeMatch;
      }

      return true;
    });
  }, [transactions, activeFilter, searchQuery]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 6,
  });

  return (
    <Card className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full">
      {/* Header with Title and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
            Transaction Ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            Chronological audit trail of all earnings, escrow settlements, and withdrawals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-9 rounded-xl"
            />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
              title="Refresh ledger"
              aria-label="Refresh transaction ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* PhonePe/CRED Categorized Filter Chips */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border mb-4 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeFilter === "ALL"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("CREDIT")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "CREDIT"
              ? "bg-card text-verified shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-verified" />
          Credits
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("DEBIT")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "DEBIT"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
          Debits
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("PENDING")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeFilter === "PENDING"
              ? "bg-card text-pending shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-pending" />
          Pending
        </button>
      </div>

      {/* Transaction List Area */}
      {isLoading ? (
        <div className="space-y-3 py-2 animate-pulse" aria-label="Loading transactions">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="w-32 sm:w-48 h-3.5 bg-muted rounded" />
                  <div className="w-20 h-2.5 bg-muted/80 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="w-20 h-4 bg-muted rounded ml-auto" />
                <div className="w-14 h-3 bg-muted/80 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <HelpCircle className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <h3 className="font-heading font-bold text-sm text-foreground mb-1">
            No Transactions Found
          </h3>
          <p className="text-xs max-w-xs text-muted-foreground">
            {searchQuery
              ? "No transactions match your search filter."
              : "When you receive campaign payouts or perform withdrawals, they will appear here in your audit ledger."}
          </p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="h-[480px] overflow-auto relative rounded-xl border border-border divide-y divide-border"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const tx = filteredTransactions[virtualRow.index];
              if (!tx) return null;
              const isCredit = CREDIT_TYPES.has(tx.type);
              const formattedAmount = formatCurrency(tx.amount);

              let statusBadge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-verified-muted text-verified border border-verified-border">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
              );

              if (tx.status === "PENDING") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pending-muted text-pending border border-pending-border">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                );
              } else if (tx.status === "FAILED" || tx.status === "REVERSED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-disputed-muted text-disputed border border-disputed-border">
                    <AlertTriangle className="w-3 h-3" /> {tx.status}
                  </span>
                );
              }

              let typeIcon = (
                <div className="w-9 h-9 rounded-full bg-verified-muted text-verified flex items-center justify-center shrink-0 border border-verified-border">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              );

              if (tx.type === "WITHDRAWAL") {
                typeIcon = (
                  <div className="w-9 h-9 rounded-full bg-escrow-muted text-escrow flex items-center justify-center shrink-0 border border-escrow-border">
                    <Building2 className="w-4 h-4" />
                  </div>
                );
              } else if (DEBIT_TYPES.has(tx.type)) {
                typeIcon = (
                  <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                );
              }

              return (
                <div
                  key={tx.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onSelectTransaction?.(tx)}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  {/* Left: Direction Icon & Description */}
                  <div className="flex items-center gap-3 min-w-0">
                    {typeIcon}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                          {tx.description || tx.type.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDateTime(tx.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          Ref: {tx.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Status Badge */}
                  <div className="text-right shrink-0 pl-3">
                    <div
                      className={`text-sm sm:text-base font-bold font-mono tabular-nums tracking-tight ${
                        isCredit
                          ? "text-verified"
                          : "text-foreground"
                      }`}
                    >
                      {isCredit ? `+ ${formattedAmount}` : `- ${formattedAmount}`}
                    </div>
                    <div className="mt-0.5">{statusBadge}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
