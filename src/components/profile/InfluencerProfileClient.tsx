"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  InfluencerProfileData,
  CampaignProofItem,
} from "./types";
import CampaignProofModal from "./CampaignProofModal";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  Star,
  Share2,
  Send,
  PlusCircle,
  Settings,
  Flame,
  Users,
  Camera,
  Video,
  Clock,
  Layers,
  MapPin,
  FileCheck2,
} from "lucide-react";

interface InfluencerProfileClientProps {
  profile: InfluencerProfileData;
  viewerRole?: string | null | undefined;
  isOwnProfile?: boolean | undefined;
}

type TabKey = "portfolio" | "rate-card" | "reviews" | "about";

export default function InfluencerProfileClient({
  profile,
  viewerRole,
  isOwnProfile = false,
}: Readonly<InfluencerProfileClientProps>) {
  const [activeTab, setActiveTab] = useState<TabKey>("portfolio");
  const [selectedProof, setSelectedProof] = useState<CampaignProofItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile swipe tracking
  const touchStartXRef = useRef<number>(0);
  const tabList: TabKey[] = ["portfolio", "rate-card", "reviews", "about"];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]!.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0]!.clientX;
    const deltaX = touchEndX - touchStartXRef.current;

    // Swipe threshold: 50px
    if (Math.abs(deltaX) > 50) {
      const currentIndex = tabList.indexOf(activeTab);
      if (deltaX < 0 && currentIndex < tabList.length - 1) {
        // Swipe left -> next tab
        setActiveTab(tabList[currentIndex + 1]!);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right -> prev tab
        setActiveTab(tabList[currentIndex - 1]!);
      }
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} on VyaparMedia`,
          text: `Check out ${profile.displayName}'s verified creator portfolio and rate card`,
          url: window.location.href,
        });
      } catch {
        // Cancelled
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setToastMessage("Profile URL copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const isBrand = (viewerRole || "").toUpperCase() === "BRAND";

  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-4 md:py-8 space-y-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold shadow-xl animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* ==================== 1. INSTAGRAM-STYLE HEADER ==================== */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-8">
          {/* Avatar (rounded-full) */}
          <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-primary/20 shadow-md flex items-center justify-center">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.displayName}
                width={112}
                height={112}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <span className="text-2xl font-black text-foreground">
                {profile.displayName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Profile Meta & Actions */}
          <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
            {/* Display Name & Dual Distinct Verification Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {profile.displayName}
              </h1>

              {/* DUAL DISTINCT VERIFICATION BADGES */}
              {profile.isSocialVerified && (
                <span
                  title="Social Verified: Instagram / YouTube confirmed via official API integration"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-primary/10 text-primary border-primary/25 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 fill-primary/20" />
                  <span>Social Verified</span>
                </span>
              )}

              {profile.isKycVerified && (
                <span
                  title="KYC Verified: Government Aadhaar/PAN identity verified on-chain & escrow ready"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-verified-muted text-verified border-verified-border shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 fill-verified/20" />
                  <span>KYC Verified</span>
                </span>
              )}
            </div>

            {/* Handle & Location */}
            <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
              <span>@{profile.instagramHandle || profile.youtubeHandle || "creator"}</span>
              {profile.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span>{profile.city}</span>
                </span>
              )}
            </p>

            {/* Niche Tags Pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
              {profile.categories.map((niche, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/80"
                >
                  {niche}
                </span>
              ))}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs sm:text-sm text-foreground/90 max-w-xl leading-relaxed pt-1">
                {profile.bio}
              </p>
            )}

            {/* ==================== 5. CONTEXT-AWARE CTA BUTTONS ==================== */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
              {isOwnProfile ? (
                <>
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-all shadow-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-all shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Profile</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/dashboard/deals?createWith=${profile.id}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Invite to Campaign</span>
                  </Link>

                  <Link
                    href={`/dashboard/messages?recipientId=${profile.userId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share creator profile"
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ==================== 1. STATS ROW (Instagram 3-Column Stats) ==================== */}
        <div className="grid grid-cols-3 gap-2 py-3.5 px-4 rounded-2xl bg-card border border-border shadow-xs text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <FileCheck2 className="w-3.5 h-3.5 text-primary" />
              <span>Completed Deals</span>
            </div>
            <span className="text-base sm:text-xl font-extrabold text-foreground tabular-nums">
              {profile.completedDealsCount}
            </span>
          </div>

          <div className="border-x border-border/70">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Trust Score</span>
            </div>
            <span className="text-base sm:text-xl font-extrabold text-foreground tabular-nums">
              {profile.trustScore}
              <span className="text-xs text-muted-foreground font-normal"> / 900</span>
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Response Rate</span>
            </div>
            <span className="text-base sm:text-xl font-extrabold text-foreground tabular-nums">
              {profile.responseRatePercent}%
              <span className="text-[10px] text-muted-foreground block sm:inline sm:ml-1 font-normal">
                ({profile.avgResponseTime})
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* ==================== 6. SWIPEABLE NAVIGATION TABS ==================== */}
      <nav aria-label="Profile Sections" className="border-b border-border/80">
        <div className="flex items-center justify-around" role="tablist">
          {[
            { id: "portfolio", label: "Campaign Proofs", count: profile.campaignProofs.length },
            { id: "rate-card", label: "Rate Card" },
            { id: "reviews", label: "Reviews", count: profile.reviews.length },
            { id: "about", label: "About" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`relative flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-bold transition-colors focus:outline-none ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                    ({tab.count})
                  </span>
                )}
                {/* Framer Motion Active Tab Indicator */}
                {active && (
                  <motion.div
                    layoutId="profileActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==================== TAB CONTENT SECTIONS ==================== */}
      <main>
        {/* TAB 1: VERIFIED CAMPAIGN PROOFS GRID */}
        {activeTab === "portfolio" && (
          <section aria-label="Verified Campaign Proofs">
            {profile.campaignProofs.length === 0 ? (
              <div className="p-10 rounded-2xl border border-border/80 bg-card text-center flex flex-col items-center justify-center space-y-2">
                <FileCheck2 className="w-8 h-8 text-muted-foreground" />
                <h4 className="text-sm font-bold text-foreground">No Verified Proofs Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Completed escrow deals with verified milestone deliverables will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {profile.campaignProofs.map((proof) => (
                  <button
                    key={proof.id}
                    type="button"
                    onClick={() => setSelectedProof(proof)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary text-left"
                  >
                    {/* Background Image or Placeholder */}
                    {proof.coverImage ? (
                      <Image
                        src={proof.coverImage}
                        alt={proof.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-primary/10 to-card">
                        <Lock className="w-6 h-6 text-escrow mb-1" />
                        <span className="text-xs font-bold text-foreground line-clamp-2">
                          {proof.title}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay for Readable Text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

                    {/* Top Escrow Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md bg-escrow-muted/95 text-escrow border border-escrow-border shadow">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Bottom Metadata: Brand + Metric */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-white font-bold text-xs truncate">
                        <span>{proof.brandName}</span>
                      </div>
                      {proof.outcomeMetric && (
                        <p className="text-[10px] text-white/80 font-medium truncate">
                          {proof.outcomeMetric}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: TRANSPARENT RATE CARD / PRICING */}
        {activeTab === "rate-card" && (
          <section aria-label="Transparent Rate Card" className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Official Rate Card
                </h3>
                <p className="text-xs text-muted-foreground">
                  Transparent escrow milestone rates. Zero hidden charges.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-verified-muted text-verified border border-verified-border">
                <Lock className="w-3 h-3" />
                <span>Escrow Protected</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.rateCard.map((item) => {
                const formattedPrice = (item.pricePaise / 100).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                });
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {item.deliverable}
                        </h4>
                        <span className="text-base font-extrabold text-foreground tabular-nums shrink-0">
                          ₹{formattedPrice}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{item.turnaround}</span>
                      </div>
                      <div>{item.revisions} Revisions Included</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: REVIEWS & FEEDBACK */}
        {activeTab === "reviews" && (
          <section aria-label="Brand Reviews" className="space-y-4">
            {profile.reviews.length === 0 ? (
              <div className="p-10 rounded-2xl border border-border/80 bg-card text-center flex flex-col items-center justify-center space-y-2">
                <Star className="w-8 h-8 text-muted-foreground" />
                <h4 className="text-sm font-bold text-foreground">No Reviews Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Verified brands will leave feedback upon deal milestone approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                          {review.brandAvatar ? (
                            <Image
                              src={review.brandAvatar}
                              alt={review.brandName}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            review.brandName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-foreground">
                            {review.brandName}
                          </h5>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating ? "fill-amber-500" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed pl-10">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: ABOUT & PLATFORM DEMOGRAPHICS */}
        {activeTab === "about" && (
          <section aria-label="About Creator" className="space-y-4">
            <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground">Audience & Platforms</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instagram Channel */}
                {profile.instagramHandle && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        @{profile.instagramHandle}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {profile.instagramFollowers?.toLocaleString("en-IN") || "0"} Followers • {profile.instagramEngagementRate || 4.2}% Eng.
                      </p>
                    </div>
                  </div>
                )}

                {/* YouTube Channel */}
                {profile.youtubeHandle && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {profile.youtubeHandle}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {profile.youtubeSubscribers?.toLocaleString("en-IN") || "0"} Subscribers
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Languages */}
              {profile.languages.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Languages Spoken
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Campaign Proof Expanded Detail Modal */}
      <CampaignProofModal
        proof={selectedProof}
        onClose={() => setSelectedProof(null)}
      />
    </div>
  );
}
