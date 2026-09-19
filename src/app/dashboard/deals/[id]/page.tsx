"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Radio, Building2, User } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useTokenRefreshGuard } from "@/hooks/useTokenRefreshGuard";
import { useDealDetail, computeDealDisplay } from "@/components/dashboard/deals/useDealDetail";
import { parseContractTerms } from "@/components/dashboard/deals/DealDetailHelpers";
import { DealProgressStepper } from "@/components/dashboard/deals/DealProgressStepper";
import { EscrowTrustCard } from "@/components/dashboard/deals/EscrowTrustCard";
import { DealContextualActions } from "@/components/dashboard/deals/DealContextualActions";
import { DealDisputeSection } from "@/components/dashboard/deals/DealDisputeSection";
import { useDealRealtime } from "@/components/dashboard/deals/useDealRealtime";
import { DealContractCard } from "@/components/dashboard/deals/DealContractCard";
import { EngagementCard } from "@/components/dashboard/deals/EngagementCard";
import { ContentSubmissionsCard } from "@/components/dashboard/deals/ContentSubmissionsCard";
import { ContentSubmissionModal } from "@/components/dashboard/deals/ContentSubmissionModal";
import { DealModals } from "@/components/dashboard/deals/DealModals";
import { Button, Skeleton, Textarea, ToastContainer } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api-client/errors";
import { formatUserError } from "@/lib/user-messages";

export default function DealDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: session } = useSession();
  const { requireFreshSession } = useTokenRefreshGuard();
  const dealState = useDealDetail(id, session, requireFreshSession);

  const {
    deal,
    fetchDeal,
    isLoading: loading,
    error,
    isSubmitting,
    reviewRating,
    setReviewRating,
    hoverRating,
    setHoverRating,
    reviewComment,
    setReviewComment,
    reviewSubmitted,
    setReviewSubmitted,
    showAddressModal,
    setShowAddressModal,
    showReviewModal,
    setShowReviewModal,
    showSubmitModal,
    setShowSubmitModal,
    showVerifyModal,
    setShowVerifyModal,
    showDispatchModal,
    setShowDispatchModal,
    dispatchForm,
    setDispatchForm,
    handleProductAction,
    shippingAddress: shippingForm,
    setShippingAddress: setShippingForm,
    itemizedUrls,
    setItemizedUrls,
    contentForm,
    setContentForm,
    postUrl,
    setPostUrl,
    itemizedReviews,
    setItemizedReviews,
    isUploadingContent,
    uploadingField,
    setUploadingField,
    fileInputRef,
    handleContentUpload,
    handleAction,
    handleReviewContent,
    showToast,
    setIsSubmitting,
    toasts,
    removeToast,
    engagement,
    engagementDisclaimer,
  } = dealState;

  // Supabase Realtime Subscription + Adaptive 2s Heartbeat
  const { justUpdated, isRealtimeActive } = useDealRealtime({
    dealId: id,
    currentStatus: deal?.status,
    onRefresh: () => {
      fetchDeal();
    },
    showToast,
  });

  const ratingLabelMap: Record<number, string> = {
    1: "Poor - Disappointed",
    2: "Fair - Needs improvement",
    3: "Good - Satisfactory",
    4: "Very Good - Great work",
    5: "Excellent - Outstanding!",
  };

  const isClient = session?.user?.userType === "BRAND";
  const isInfluencer = session?.user?.userType === "INFLUENCER";

  if (loading) {
    return (
      <DashboardShell user={session?.user || undefined}>
        <div className="max-w-5xl mx-auto space-y-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-48 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !deal) {
    return (
      <DashboardShell user={session?.user || undefined}>
        <div className="text-center p-12 bg-card border border-border rounded-xl max-w-lg mx-auto mt-8">
          <div className="text-rose font-bold text-lg mb-2">Deal Not Found</div>
          <div className="text-sm text-secondary mb-6">{String(error || "This deal could not be located or you don't have access.")}</div>
          <Button href="/dashboard/deals" variant="secondary">
            Back to Deals
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const terms = parseContractTerms(deal.contractTerms);
  const { canSubmitContent } = computeDealDisplay(deal, terms);

  const isEscrowLocked = [
    "PAYMENT_HELD",
    "ACTIVE",
    "CONTENT_SUBMITTED",
    "REVISION_REQUESTED",
    "CONTENT_APPROVED",
    "POSTED",
    "VERIFICATION_PENDING",
    "VERIFIED",
  ].includes(deal.status);

  return (
    <DashboardShell user={session?.user || undefined}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Top Navigation & Counterparty Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/dashboard/deals"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-foreground font-medium mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Deals
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {deal.campaign?.title || "Campaign Deal"}
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-secondary border border-border">
              ID: {deal.id.slice(-6)}
            </span>
          </div>
        </div>

        {/* Counterparty Badge & Realtime Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
            {isClient ? (
              <>
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-secondary">Creator:</span>
                <span className="font-bold text-foreground">
                  {deal.influencer?.displayName || "Influencer"}
                </span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-secondary">Brand:</span>
                <span className="font-bold text-foreground">
                  {deal.brand?.companyName || "Brand Partner"}
                </span>
              </>
            )}
          </div>

          {/* Real-time sync beacon */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-secondary"
            title="Real-time live sync active"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">Live Sync</span>
          </div>
        </div>
      </div>

      {/* 1. Progress Stepper with "Did that work?" Confirmation Motion */}
      <DealProgressStepper status={deal.status} justUpdated={justUpdated} />

      {/* 2. Escrow Amount Card (Tabular-nums, Indian Currency Grouping, Safe Funds Copy) */}
      <EscrowTrustCard
        amountInPaise={deal.amount}
        totalAmountInPaise={deal.totalAmount}
        platformFeeInPaise={deal.platformFee}
        gatewayFeeInPaise={deal.gatewayFee}
        creatorPayoutInPaise={typeof terms?.influencerPayout === "number" ? terms.influencerPayout : deal.influencerPayout || undefined}
        isEscrowLocked={isEscrowLocked}
        isCompleted={deal.status === "COMPLETED"}
        isDisputed={deal.status === "DISPUTED"}
        isCancelled={deal.status === "CANCELLED"}
        brandCompanyName={deal.brand?.companyName || "Brand"}
        creatorName={deal.influencer?.displayName || "Creator"}
        isBrand={isClient}
      />

      {/* 3. Contextual Role-Based Action Engine */}
      <DealContextualActions
        dealStatus={deal.status}
        dealId={deal.id}
        isInfluencer={isInfluencer}
        isBrand={isClient}
        isSubmitting={isSubmitting}
        canSubmitContent={canSubmitContent}
        deal={deal}
        handleSignContract={() => dealState.handleSignContract()}
        handleRejectInvite={() => dealState.handleRejectInvite()}
        handleCancelDeal={() => dealState.handleCancelDeal()}
        handleAction={dealState.handleAction}
        setItemizedUrls={setItemizedUrls}
        setContentForm={setContentForm}
        setShowSubmitModal={setShowSubmitModal}
        setShowVerifyModal={setShowVerifyModal}
        setItemizedReviews={setItemizedReviews}
        setShowReviewModal={setShowReviewModal}
      />

      {/* 4. Calm Dispute Entry Point & Active Dispute Banner */}
      <DealDisputeSection
        dealId={deal.id}
        status={deal.status}
        isBrand={isClient}
      />

      {/* 5. Deal Detail Content Layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DealContractCard
            deal={deal}
            isBrand={isClient}
            isInfluencer={isInfluencer}
            onOpenAddressModal={() => setShowAddressModal(true)}
            onOpenDispatchModal={() => setShowDispatchModal(true)}
            onConfirmReceived={() => handleProductAction({ action: "confirm_received" })}
            isSubmitting={isSubmitting}
          />

          <ContentSubmissionsCard submissions={deal.contentSubmissions} />
        </div>

        <div className="flex flex-col gap-6">
          <EngagementCard
            engagement={engagement}
            disclaimer={engagementDisclaimer}
            isClient={isClient}
          />
        </div>
      </div>

      {/* 6. Post-Deal Review Card */}
      {deal.status === "COMPLETED" && !reviewSubmitted && (
        <div className="card mt-6 p-6 rounded-xl border border-border bg-card shadow-sm">
          <h3 className="font-bold text-lg mb-1 text-foreground">Rate This Collaboration</h3>
          <p className="text-xs sm:text-sm text-secondary mb-4">
            Your review and rating directly inform the user trust score on VyaparMedia.
          </p>
          <div className="flex items-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={(hoverRating || reviewRating) >= star ? "true" : "false"}
                className={`text-2xl p-1 bg-transparent hover:bg-transparent ${
                  (hoverRating || reviewRating) >= star
                    ? "text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              >
                ★
              </Button>
            ))}
            {reviewRating > 0 && (
              <span className="text-xs font-semibold text-primary ml-2">
                {ratingLabelMap[reviewRating] || "Excellent"}
              </span>
            )}
          </div>
          <Textarea
            placeholder="Share feedback on communication, turnaround, and content quality (optional)..."
            aria-label="Share your experience"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
            className="mb-4 text-sm"
          />
          <Button
            variant="primary"
            disabled={reviewRating === 0 || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await apiClient.settings.submitReview({
                  dealId: id,
                  rating: reviewRating,
                  ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
                });
                showToast("success", "Review submitted! Thank you.");
                setReviewSubmitted(true);
              } catch (err: unknown) {
                showToast("error", formatUserError(err, "Failed to submit review. Please try again."));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>

        </div>
      )}

      {deal.status === "COMPLETED" && reviewSubmitted && (
        <div className="card flex items-center gap-3 rounded-xl mt-6 p-4 border border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
          <span className="text-2xl text-emerald-600 dark:text-emerald-400">✓</span>
          <div>
            <strong className="block text-sm">Review Submitted</strong>
            <p className="text-xs text-secondary mt-0.5">
              {"★".repeat(Math.max(0, reviewRating))} Thank you for helping build trust in our community.
            </p>
          </div>
        </div>
      )}

      {/* Modals for Reviews, Addresses, Verification, etc. */}
      <DealModals
        showAddressModal={showAddressModal}
        setShowAddressModal={setShowAddressModal}
        showReviewModal={showReviewModal}
        setShowReviewModal={setShowReviewModal}
        showVerifyModal={showVerifyModal}
        setShowVerifyModal={setShowVerifyModal}
        showDispatchModal={showDispatchModal}
        setShowDispatchModal={setShowDispatchModal}
        deal={deal}
        shippingForm={shippingForm}
        setShippingForm={setShippingForm}
        dispatchForm={dispatchForm}
        setDispatchForm={setDispatchForm}
        postUrl={postUrl}
        setPostUrl={setPostUrl}
        isSubmitting={isSubmitting}
        handleAction={handleAction}
        handleProductAction={handleProductAction}
        showToast={showToast}
        handleReviewContent={handleReviewContent}
        itemizedReviews={itemizedReviews}
        setItemizedReviews={setItemizedReviews}
      />

      {/* Multi-step Instagram-inspired Content Submission Modal */}
      {deal && (
        <ContentSubmissionModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          deal={deal}
          onSuccess={() => {
            fetchDeal();
            showToast("success", "Content submitted for review!");
          }}
        />
      )}
    </DashboardShell>
  );
}
