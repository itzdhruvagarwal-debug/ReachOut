"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import EmptyState from "@/components/ui/EmptyState";
import { Badge, Input } from "@/components/ui";
import { formatDate } from "@/lib/utils-client";
import type { AdminService } from "@/services/admin.service";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, Filter, AlertCircle } from "lucide-react";

type AdminViolationElement = Prisma.PromiseReturnType<typeof AdminService.listViolations>[number];
type ListViolationsResult = {
  success: boolean;
  data: AdminViolationElement[];
};

function getSeverityVariant(severity: string): "danger" | "warning" | "success" | "ghost" {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "success";
    default:
      return "ghost";
  }
}

function getActionVariant(action: string): "danger" | "warning" | "ghost" {
  switch (action) {
    case "PERMANENT_BAN":
      return "danger";
    case "TEMP_SUSPENSION":
      return "warning";
    default:
      return "ghost";
  }
}

export default function AdminViolationsPage() {
  const [userIdFilter, setUserIdFilter] = useState("");

  const queryParams = new URLSearchParams();
  if (userIdFilter.trim()) queryParams.set("userId", userIdFilter.trim());

  const { data, error, isLoading } = useSWR<ListViolationsResult>(
    `/api/admin/violations?${queryParams.toString()}`,
    fetcher
  );

  const violations = data?.data || [];

  let content;
  if (isLoading) {
    content = (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/40 border border-border animate-pulse" />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-disputed-muted border border-disputed-border text-disputed text-sm font-medium">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Failed to load violations.
      </div>
    );
  } else if (violations.length === 0) {
    content = (
      <EmptyState
        emoji=""
        title="No Violations"
        description="No violations match the filter."
      />
    );
  } else {
    content = (
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" aria-label="User violations list">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {["User", "Type", "Severity", "Action", "Description", "Date", "Expires"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="text-left px-4 py-3 text-xs font-extrabold text-muted-foreground uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {violations.map((violation: AdminViolationElement) => {
                const name =
                  violation.user.influencerProfile?.displayName ||
                  violation.user.brandProfile?.companyName ||
                  violation.user.email;

                return (
                  <tr key={violation.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm text-foreground">{name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {violation.user.email} · {violation.user.userType}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm text-foreground">
                      {violation.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={getSeverityVariant(violation.severity)}
                        className="font-extrabold text-xs uppercase"
                      >
                        {violation.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={getActionVariant(violation.action)}
                        className="font-extrabold text-xs uppercase"
                      >
                        {violation.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div
                        className="overflow-hidden whitespace-nowrap max-w-[200px] text-ellipsis"
                        title={violation.description}
                      >
                        {violation.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(violation.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(violation.expiresAt, "Never")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-disputed/10 border border-disputed-border flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-disputed" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            User Violations
          </h1>
          <p className="text-sm text-muted-foreground">
            View all user violations and enforcement actions.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm max-w-md">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filter by User
        </div>
        <Input
          label="User ID"
          id="filter-user-id"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          placeholder="Enter exact User ID..."
          fullWidth
        />
      </div>

      {!isLoading && !error && violations.length > 0 && (
        <div className="text-xs text-muted-foreground font-medium">
          Showing {violations.length} violation{violations.length !== 1 ? "s" : ""}
        </div>
      )}

      {content}
    </div>
  );
}
