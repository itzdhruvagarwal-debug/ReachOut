"use client";

import React from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui";

export interface FilterTabOption {
  key: string;
  label: string;
  count?: number;
}

interface DealsFilterToolbarProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tabCounts?: Record<string, number>;
}

export const DEAL_STATUS_TABS: FilterTabOption[] = [
  { key: "all", label: "All Deals" },
  { key: "PENDING_SIGNATURE", label: "Awaiting Signature" },
  { key: "ACTIVE", label: "Active" },
  { key: "PAYMENT_HELD", label: "Secured" },
  { key: "CONTENT_SUBMITTED", label: "Awaiting Review" },
  { key: "REVISION_REQUESTED", label: "Revision Needed" },
  { key: "CONTENT_APPROVED", label: "Ready to Post" },
  { key: "POSTED", label: "Post Submitted" },
  { key: "VERIFIED", label: "Verified" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DISPUTED", label: "Disputed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export function DealsFilterToolbar({
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  tabCounts = {},
}: Readonly<DealsFilterToolbarProps>) {
  return (
    <div className="space-y-3.5 mb-6">
      {/* 1. Search Bar & Status Quick Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by campaign, brand name, or deliverable..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown (on mobile/small screens for rapid selection) */}
        <div className="relative sm:w-56 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2.5 px-3.5 rounded-xl border border-input bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium appearance-none cursor-pointer"
            aria-label="Filter deals by status"
          >
            {DEAL_STATUS_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label} {tabCounts[tab.key] !== undefined ? `(${tabCounts[tab.key]})` : ""}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* 2. Horizontally Scrollable Stage Tabs (Upwork "My Jobs" Style) */}
      <nav
        aria-label="Deal status filters"
        className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1"
      >
        {DEAL_STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          const count = tabCounts[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border hover:border-border/80"
              }`}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
