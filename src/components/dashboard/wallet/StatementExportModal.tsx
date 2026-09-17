"use client";

import { apiClient } from "@/lib/api-client";

import React, { useState } from "react";
import { X, Download, FileText, Calendar, Filter, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";

interface StatementExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: string | null | undefined;
  userName?: string | null | undefined;
}

export function StatementExportModal({
  isOpen,
  onClose,
  userType,
  userName,
}: StatementExportModalProps) {
  const [period, setPeriod] = useState<"30D" | "CURRENT_MONTH" | "90D" | "FY2526" | "CUSTOM">("CURRENT_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [txnType, setTxnType] = useState<"ALL" | "CREDIT" | "WITHDRAWAL">("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateDateRange = () => {
    const now = new Date();
    let start: Date;
    let end = now;

    if (period === "30D") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "CURRENT_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "90D") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === "FY2526") {
      start = new Date("2025-04-01T00:00:00Z");
      end = new Date("2026-03-31T23:59:59Z");
    } else {
      start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = endDate ? new Date(endDate) : now;
    }

    return {
      startStr: start.toISOString().split("T")[0] || "",
      endStr: end.toISOString().split("T")[0] || "",
    };
  };

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const { startStr, endStr } = calculateDateRange();

      const blob = await apiClient.wallet.exportTransactionsCsv({
        startDate: startStr,
        endDate: endStr,
        type: txnType,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VyaparMedia-Statement-${startStr}-to-${endStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Failed to download statement");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export Financial Statement"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Download Financial Statement
              </h3>
              <p className="text-xs text-secondary">
                Generate an official ledger statement for accounting & tax records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Period Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Statement Period
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: "CURRENT_MONTH", label: "This Month" },
                { id: "30D", label: "Last 30 Days" },
                { id: "90D", label: "Last Quarter" },
                { id: "FY2526", label: "FY 2025-26" },
                { id: "CUSTOM", label: "Custom Range" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as typeof period)}
                  className={`p-2.5 rounded-xl border font-semibold text-center transition-all ${
                    period === p.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/20 hover:bg-secondary/50 text-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {period === "CUSTOM" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
              <div>
                <label className="text-[11px] font-semibold text-secondary mb-1 block" htmlFor="custom-start-date">
                  Start Date
                </label>
                <Input
                  id="custom-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-secondary mb-1 block" htmlFor="custom-end-date">
                  End Date
                </label>
                <Input
                  id="custom-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* Filter by Type */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              Transaction Filter
            </label>
            <div className="flex gap-2 text-xs">
              {[
                { id: "ALL", label: "All Activity" },
                { id: "CREDIT", label: "Credits Only" },
                { id: "WITHDRAWAL", label: "Withdrawals Only" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxnType(t.id as typeof txnType)}
                  className={`flex-1 p-2 rounded-lg border font-semibold text-center transition-all ${
                    txnType === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/20 hover:bg-secondary/50 text-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tax Compliance Note */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-secondary space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Includes PAN &amp; TDS Section 194S Line Items</span>
            </div>
            <p className="text-[11px]">
              Statements generated conform to Indian tax reporting guidelines and can be submitted for ITR/GST filing.
            </p>
          </div>

          {exportError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{exportError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border bg-secondary/20">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePrintStatement}
            className="gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={isExporting}
              className="gap-1.5 font-bold"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Generating..." : "Download CSV"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
