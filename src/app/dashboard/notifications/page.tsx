"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import {
  NotificationItem,
  groupNotificationsByRecency,
  formatNotificationTime,
  getNotificationTypeMeta,
  getNotificationHref,
} from "@/lib/notification-utils";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  Settings,
  Wallet,
  Briefcase,
  MessageSquare,
  ShieldAlert,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

function renderActivityIcon(iconName: string, className: string) {
  switch (iconName) {
    case "wallet":
      return <Wallet className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    case "message":
      return <MessageSquare className={className} />;
    case "shield-alert":
      return <ShieldAlert className={className} />;
    case "star":
      return <Star className={className} />;
    default:
      return <Bell className={className} />;
  }
}

type FilterTab = "all" | "unread" | "deals" | "payments" | "messages";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotificationCenter(userId);

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === "unread") return !notif.isRead;
      if (activeFilter === "deals") {
        return getNotificationTypeMeta(notif.type).category === "deal";
      }
      if (activeFilter === "payments") {
        return getNotificationTypeMeta(notif.type).category === "payment";
      }
      if (activeFilter === "messages") {
        return getNotificationTypeMeta(notif.type).category === "message";
      }
      return true;
    });
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => {
    return groupNotificationsByRecency(filteredNotifications);
  }, [filteredNotifications]);

  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    const href = getNotificationHref(notif);
    router.push(href);
  };

  const sections = [
    { title: "Today", items: grouped.today },
    { title: "Earlier this week", items: grouped.thisWeek },
    { title: "Older", items: grouped.older },
  ].filter((s) => s.items.length > 0);

  return (
    <DashboardShell user={session?.user}>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Activity Feed
                </h1>
                <p className="text-xs text-muted-foreground">
                  Real-time updates on your deals, payments, messages, and disputes
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllAsRead}
                className="gap-1.5 text-xs font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                <span>Mark all read ({unreadCount})</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              title="Refresh notifications"
              className="p-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <Link href="/dashboard/settings?tab=notifications">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { key: "all", label: "All Activity" },
              { key: "unread", label: `Unread (${unreadCount})` },
              { key: "deals", label: "Deals & Contracts" },
              { key: "payments", label: "Payments & Escrow" },
              { key: "messages", label: "Messages" },
            ] as const
          ).map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Feed Card */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden divide-y divide-border/60">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-foreground">You&apos;re completely caught up!</h2>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                No notifications match your current filter. When new transactions, chat messages, or milestones occur, they will appear here instantly.
              </p>
            </div>
          ) : (
            sections.map((sec) => (
              <div key={sec.title} className="p-0">
                {/* Section Header */}
                <div className="px-5 py-2.5 bg-muted/30 border-b border-border/60 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{sec.title}</span>
                  <span className="text-[11px] font-medium lowercase">
                    {sec.items.length} {sec.items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Items in section */}
                <div className="divide-y divide-border/40">
                  {sec.items.map((item) => {
                    const meta = getNotificationTypeMeta(item.type);
                    const timeStr = formatNotificationTime(item.createdAt);

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleItemClick(item);
                          }
                        }}
                        className={`w-full text-left p-4 sm:p-5 flex items-start gap-4 transition-colors hover:bg-muted/40 cursor-pointer ${
                          item.isRead ? "opacity-90" : "bg-primary/[0.03] dark:bg-primary/[0.07]"
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.badgeBg} ${meta.borderColor} ${meta.textColor} shadow-sm`}
                        >
                          {renderActivityIcon(meta.iconName, "w-5 h-5")}
                        </div>

                        {/* Middle Text */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`text-sm tracking-tight ${
                                item.isRead ? "font-semibold text-foreground" : "font-bold text-foreground"
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              {timeStr}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span
                              className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.borderColor} ${meta.textColor}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                        </div>

                        {/* Unread dot & Action */}
                        <div className="flex items-center gap-2 shrink-0 pt-2">
                          {!item.isRead && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50"
                              title="Unread"
                            />
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
