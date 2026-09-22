"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Sparkles, TrendingUp, PlusCircle, Compass } from "lucide-react";
import { formatCurrency } from "@/lib/utils-client";

interface DashboardStoriesBarProps {
  isBrand: boolean;
  activeDealsCount: number;
  escrowBalancePaise: number;
  trustScore: number;
  level: number;
}

export function DashboardStoriesBar({
  isBrand,
  activeDealsCount,
  escrowBalancePaise,
  trustScore,
  level,
}: Readonly<DashboardStoriesBarProps>) {
  const stories = [
    {
      id: "action-deals",
      label: activeDealsCount > 0 ? `${activeDealsCount} Active Deals` : "Collaborations",
      subtext: activeDealsCount > 0 ? "In Pipeline" : "Start New",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      href: "/dashboard/deals",
      ringColor: "ring-primary border-background",
      hasPulse: activeDealsCount > 0,
    },
    {
      id: "escrow-vault",
      label: "Escrow Vault",
      subtext: escrowBalancePaise > 0 ? formatCurrency(escrowBalancePaise) : "Protected",
      icon: <Lock className="w-5 h-5 text-escrow" />,
      href: "/dashboard/wallet",
      ringColor: "ring-escrow border-background",
      hasPulse: escrowBalancePaise > 0,
    },
    {
      id: "trust-drs",
      label: `DRS ${trustScore}`,
      subtext: `Level ${level} Elite`,
      icon: <ShieldCheck className="w-5 h-5 text-verified" />,
      href: "/dashboard/leaderboard",
      ringColor: "ring-verified border-background",
      hasPulse: false,
    },
    {
      id: "explore-collabs",
      label: isBrand ? "Discover Creators" : "Find Campaigns",
      subtext: "Live Market",
      icon: isBrand ? (
        <Compass className="w-5 h-5 text-primary" />
      ) : (
        <TrendingUp className="w-5 h-5 text-primary" />
      ),
      href: isBrand ? "/dashboard/influencers" : "/dashboard/campaigns",
      ringColor: "ring-muted-foreground/30 border-background",
      hasPulse: false,
    },
    {
      id: "quick-create",
      label: isBrand ? "New Campaign" : "Media Kit",
      subtext: isBrand ? "Launch 1-Click" : "Update Rates",
      icon: <PlusCircle className="w-5 h-5 text-secondary-foreground" />,
      href: isBrand ? "/dashboard/campaigns/create" : "/dashboard/creator-profile",
      ringColor: "ring-border border-background",
      hasPulse: false,
    },
  ];

  return (
    <nav
      aria-label="Dashboard highlights"
      className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1"
    >
      {stories.map((story) => (
        <Link
          key={story.id}
          href={story.href}
          className="group flex flex-col items-center gap-1.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1 transition-all"
        >
          <div className="relative">
            {/* Instagram-style active ring */}
            {story.hasPulse ? (
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105 flex items-center justify-center overflow-hidden shadow-xs">
                {/* Rotating gradient ring */}
                <div
                  className="absolute inset-[-50%] rounded-full bg-gradient-to-tr from-primary via-purple-500 to-pink-500 animate-spin"
                  style={{ animationDuration: "6s" }}
                  aria-hidden="true"
                />
                {/* Card background gap */}
                <div className="relative w-full h-full rounded-full p-[2px] bg-card flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-muted/60 flex items-center justify-center transition-colors group-hover:bg-muted">
                    {story.icon}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 ring-2 ${story.ringColor} transition-transform duration-200 group-hover:scale-105 flex items-center justify-center bg-card`}
              >
                <div className="w-full h-full rounded-full bg-muted/60 flex items-center justify-center transition-colors group-hover:bg-muted">
                  {story.icon}
                </div>
              </div>
            )}
            {story.hasPulse && (
              <span
                className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card animate-pulse shadow-xs"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="text-center">
            <span className="block text-[11px] sm:text-xs font-bold text-foreground group-hover:text-primary transition-colors max-w-[80px] sm:max-w-[90px] truncate">
              {story.label}
            </span>
            <span className="block text-[10px] text-muted-foreground font-medium max-w-[80px] sm:max-w-[90px] truncate">
              {story.subtext}
            </span>
          </div>
        </Link>
      ))}
    </nav>
  );
}
