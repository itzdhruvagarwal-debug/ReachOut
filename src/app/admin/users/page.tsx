"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { banUser, unbanUser, awardBadgeAction } from "../actions";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import { Badge, Button, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils-client";
import { formatUserError } from "@/lib/user-messages";
import type { AdminService } from "@/services/admin.service";
import type { Prisma } from "@prisma/client";
import {
  Users,
  Search,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type AdminUserListElement = Prisma.PromiseReturnType<typeof AdminService.listUsers>["users"][number];
type ListUsersResult = {
  success: boolean;
  data: {
    users: AdminUserListElement[];
    total: number;
  };
};

interface TaxComplianceUser {
  userType: string;
  taxCompliance?: {
    panLast4?: string | null;
    eInvoiceApplicable?: boolean | null;
    status?: string | null;
    gstinLast4?: string | null;
  } | null;
}

function taxStatusLabel(user: TaxComplianceUser) {
  if (user.userType === "ADMIN") return "N/A";
  const tax = user.taxCompliance;
  if (!tax?.panLast4) return "PAN missing";
  if (user.userType === "BRAND" && tax.eInvoiceApplicable) return "E-invoice";
  if (tax.status === "READY") return "Ready";
  return tax.status ? tax.status.toLowerCase().replaceAll("_", " ") : "Pending";
}

function taxStatusTone(user: TaxComplianceUser): "success" | "danger" | "warning" | "ghost" {
  if (user.userType === "ADMIN") return "ghost";
  const tax = user.taxCompliance;
  if (!tax?.panLast4) return "danger";
  if (tax.status === "READY") return "success";
  return "warning";
}

interface UserRowProps {
  readonly user: AdminUserListElement;
  readonly onBan: (id: string) => void;
  readonly onUnban: (id: string) => void;
  readonly onAwardBadge: (e: React.FormEvent<HTMLFormElement>, id: string) => void;
  readonly isActionLoading?: boolean;
}

function UserRow({ user, onBan, onUnban, onAwardBadge, isActionLoading }: UserRowProps) {
  const name =
    user.influencerProfile?.displayName ||
    user.brandProfile?.companyName ||
    (user.userType === "ADMIN" ? user.email?.split("@")[0] : null) ||
    "Unknown user";
  const avatar = user.influencerProfile?.avatar || user.brandProfile?.logo;
  const isBanned = user.status === "BANNED";

  const getStatusVariant = (status: string) => {
    if (status === "ACTIVE") return "success";
    if (status === "BANNED" || status === "SUSPENDED") return "danger";
    if (status === "FLAGGED") return "warning";
    return "ghost";
  };

  return (
    <tr className="hover:bg-muted/20 transition-colors group">
      {/* Identity */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0 overflow-hidden relative">
            {avatar ? (
              <Image
                src={avatar}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground truncate max-w-[200px]">
              {name}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {user.email}
            </div>
            {user.badges && user.badges.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {user.badges.map((b: { badgeId: string }) => (
                  <span
                    key={b.badgeId}
                    className="text-[9px] bg-muted/60 border border-border px-1.5 py-0.2 rounded-md text-muted-foreground font-bold capitalize"
                  >
                    🏆 {b.badgeId.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-5 py-4">
        <Badge variant="primary" className="text-[10px] uppercase font-bold">
          {user.userType}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <Badge variant={getStatusVariant(user.status)} className="text-[10px] uppercase">
          {user.status.toLowerCase().replaceAll("_", " ")}
        </Badge>
      </td>

      {/* Tax */}
      <td className="px-5 py-4 text-xs">
        <Badge variant={taxStatusTone(user)} className="text-[10px]">
          {taxStatusLabel(user)}
        </Badge>
        {user.taxCompliance?.gstinLast4 && (
          <div className="text-muted-foreground text-[10px] mt-0.5 font-mono">
            GST ****{user.taxCompliance.gstinLast4}
          </div>
        )}
      </td>

      {/* Trust */}
      <td className="px-5 py-4 text-center">
        <span className="font-black text-sm text-foreground">
          {user.trustScore}
        </span>
        <span className="text-[10px] text-muted-foreground">/900</span>
      </td>

      {/* Joined */}
      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(user.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          {user.userType !== "ADMIN" && (
            <form onSubmit={(e) => onAwardBadge(e, user.id)} className="inline-flex items-center gap-1.5">
              <input type="hidden" name="userId" value={user.id} />
              <Select
                name="badgeId"
                className="text-xs py-1 min-h-[44px] h-11 max-w-[130px]"
                defaultValue=""
                required
                disabled={Boolean(isActionLoading)}
              >
                <option value="" disabled>Badge...</option>
                <option value="beta_tester" disabled={user.badges?.some((b: { badgeId: string }) => b.badgeId === "beta_tester")}>
                  Beta Tester
                </option>
                <option value="mystery_badge" disabled={user.badges?.some((b: { badgeId: string }) => b.badgeId === "mystery_badge")}>
                  Mystery
                </option>
                <option value="bug_reporter" disabled={user.badges?.some((b: { badgeId: string }) => b.badgeId === "bug_reporter")}>
                  Bug Hunter
                </option>
                <option value="feedback_giver" disabled={user.badges?.some((b: { badgeId: string }) => b.badgeId === "feedback_giver")}>
                  Idea Gen
                </option>
              </Select>
              <Button
                variant="secondary"
                type="submit"
                className="min-h-[44px] min-w-[44px] px-3 font-bold flex items-center justify-center cursor-pointer"
                disabled={Boolean(isActionLoading)}
                aria-label="Award badge"
              >
                <Award className="w-4 h-4" />
              </Button>
            </form>
          )}

          {user.userType !== "ADMIN" && (
            <>
              {user.status === "FLAGGED" && (
                <Button
                  variant="success"
                  onClick={() => onUnban(user.id)}
                  className="min-h-[44px] px-3.5 font-bold cursor-pointer"
                  disabled={Boolean(isActionLoading)}
                >
                  Approve
                </Button>
              )}
              {isBanned ? (
                <Button
                  variant="secondary"
                  onClick={() => onUnban(user.id)}
                  className="min-h-[44px] px-3.5 font-bold cursor-pointer"
                  disabled={Boolean(isActionLoading)}
                >
                  Unban
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => onBan(user.id)}
                  className="min-h-[44px] px-3.5 font-bold cursor-pointer"
                  disabled={Boolean(isActionLoading)}
                >
                  Ban
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const limit = 50;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (type !== "ALL") queryParams.set("type", type);
  if (status !== "ALL") queryParams.set("status", status);

  const { data, error, isLoading, mutate } = useSWR<ListUsersResult>(
    `/api/admin/users?${queryParams.toString()}`,
    fetcher
  );

  const users = data?.data?.users || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / (limit || 1)));

  const handleBan = async (userId: string) => {
    if (!confirm("Are you sure you want to ban this user?")) return;
    setLoadingAction(userId);
    try {
      await banUser(userId);
      mutate();
    } catch (err) {
      alert(formatUserError(err, "Failed to ban user. Please try again."));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setLoadingAction(userId);
    try {
      await unbanUser(userId);
      mutate();
    } catch (err) {
      alert(formatUserError(err, "Failed to unban user. Please try again."));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAwardBadge = async (e: React.FormEvent<HTMLFormElement>, userId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoadingAction(userId);
    try {
      await awardBadgeAction(formData);
      alert("Badge awarded successfully!");
      mutate();
    } catch (err) {
      alert(formatUserError(err, "Failed to award badge. Please try again."));
    } finally {
      setLoadingAction(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-user-${i}`}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded hidden sm:block" />
              <div className="h-8 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center text-disputed text-sm font-bold">
          Failed to load users from directory.
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="p-8">
          <EmptyState
            emoji="👥"
            title="No Users Found"
            description="Try changing your search keywords or filter criteria."
          />
        </div>
      );
    }

    return (
      <>
        {/* Mobile Card Layout (sm:hidden) */}
        <div className="space-y-3 sm:hidden p-3">
          {users.map((user: AdminUserListElement) => {
            const name =
              user.influencerProfile?.displayName ||
              user.brandProfile?.companyName ||
              (user.userType === "ADMIN" ? user.email?.split("@")[0] : null) ||
              "Unknown user";
            const avatar = user.influencerProfile?.avatar || user.brandProfile?.logo;
            const isBanned = user.status === "BANNED";

            return (
              <div
                key={user.id}
                className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0 overflow-hidden relative">
                      {avatar ? (
                        <Image src={avatar} alt="" fill unoptimized className="object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">{name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="primary" className="text-[10px] uppercase font-bold">
                      {user.userType}
                    </Badge>
                    <Badge variant={user.status === "ACTIVE" ? "success" : user.status === "BANNED" ? "danger" : "warning"} className="text-[10px] uppercase">
                      {user.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/60">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground">Tax Status</span>
                    <Badge variant={taxStatusTone(user)} className="text-[10px] mt-0.5">
                      {taxStatusLabel(user)}
                    </Badge>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground">Trust Score</span>
                    <span className="font-black text-sm text-foreground">{user.trustScore}</span>
                    <span className="text-[10px] text-muted-foreground"> /900</span>
                  </div>
                </div>

                {user.userType !== "ADMIN" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {user.status === "FLAGGED" && (
                      <Button
                        variant="success"
                        onClick={() => handleUnban(user.id)}
                        className="flex-1 min-h-[44px] font-bold text-xs cursor-pointer"
                        disabled={loadingAction === user.id}
                      >
                        Approve
                      </Button>
                    )}
                    {isBanned ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleUnban(user.id)}
                        className="flex-1 min-h-[44px] font-bold text-xs cursor-pointer"
                        disabled={loadingAction === user.id}
                      >
                        Unban
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => handleBan(user.id)}
                        className="flex-1 min-h-[44px] font-bold text-xs cursor-pointer"
                        disabled={loadingAction === user.id}
                      >
                        Ban Account
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Platform users">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["User", "Role", "Status", "Tax Compliance", "Trust", "Joined", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user: AdminUserListElement) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isActionLoading={loadingAction === user.id}
                  onBan={handleBan}
                  onUnban={handleUnban}
                  onAwardBadge={handleAwardBadge}
                />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              User Directory
            </h1>
            <p className="text-sm text-muted-foreground">
              Search, moderate, award credentials, and inspect tax readiness.
            </p>
          </div>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Matches
            </div>
            <div className="text-sm font-black text-foreground">{total} accounts</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            name="search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 w-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-36 min-h-[44px]"
          >
            <option value="ALL">All roles</option>
            <option value="INFLUENCER">Influencers</option>
            <option value="BRAND">Brands</option>
          </Select>

          <Select
            name="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 min-h-[44px]"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
            <option value="FLAGGED">Flagged</option>
          </Select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        {renderContent()}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            variant="secondary"
            aria-label="Previous page"
            aria-disabled={page <= 1}
            disabled={page <= 1}
            className="gap-1 font-bold min-h-[44px] px-4 flex-1 sm:flex-initial"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </Button>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            variant="secondary"
            aria-label="Next page"
            aria-disabled={page >= totalPages}
            disabled={page >= totalPages}
            className="gap-1 font-bold min-h-[44px] px-4 flex-1 sm:flex-initial"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <span className="font-medium">
          Page {page} of {totalPages} &bull; Showing {users.length} of {total} accounts
        </span>
      </div>
    </div>
  );
}
