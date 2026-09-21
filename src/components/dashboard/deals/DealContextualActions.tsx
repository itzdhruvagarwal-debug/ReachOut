"use client";

import React from "react";
import { Button } from "@/components/ui";
import {
  FileCheck,
  UploadCloud,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { DealDetail, getFlatDeliverablesList, ContentUrlEntry } from "./DealDetailHelpers";

export interface DealContextualActionsProps {
  dealStatus: string;
  dealId: string;
  isInfluencer: boolean;
  isBrand: boolean;
  isSubmitting: boolean;
  canSubmitContent: boolean;
  deal: DealDetail;
  handleSignContract: () => void;
  handleRejectInvite: () => void;
  handleCancelDeal: () => void;
  handleAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
  setItemizedUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setContentForm: React.Dispatch<React.SetStateAction<{ contentUrl: string; notes: string }>>;
  setShowSubmitModal: (v: boolean) => void;
  setShowVerifyModal: (v: boolean) => void;
  setItemizedReviews: React.Dispatch<React.SetStateAction<Record<string, { status: "APPROVED" | "REVISION_REQUESTED"; feedback: string }>>>;
  setShowReviewModal: (v: boolean) => void;
}

export function DealContextualActions({
  dealStatus,
  dealId,
  isInfluencer,
  isBrand,
  isSubmitting,
  canSubmitContent,
  deal,
  handleSignContract,
  handleRejectInvite,
  handleCancelDeal,
  handleAction,
  setItemizedUrls,
  setContentForm,
  setShowSubmitModal,
  setShowVerifyModal,
  setItemizedReviews,
  setShowReviewModal,
}: DealContextualActionsProps) {
  const contractSignature = (deal?.contractSignature && typeof deal.contractSignature === "object"
    ? deal.contractSignature
    : {}) as Record<string, unknown>;
  const brandSigned = Boolean(deal?.brandSignedAt || contractSignature?.brandSignature);
  const influencerSigned = Boolean(deal?.influencerSignedAt || contractSignature?.influencerSignature);
  const userHasSigned = isBrand ? brandSigned : influencerSigned;
  const counterpartySigned = isBrand ? influencerSigned : brandSigned;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Contextual Action Description */}
        <div className="flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Next Action
          </span>
          <div className="mt-1">
            {dealStatus === "PENDING_SIGNATURE" && (
              <p className="text-sm font-semibold text-foreground">
                {userHasSigned
                  ? `You have signed the contract. Waiting for ${isBrand ? "Creator" : "Brand"} to countersign.`
                  : counterpartySigned
                  ? `${isBrand ? "Creator" : "Brand"} has signed! Please sign the contract to lock escrow.`
                  : "Both parties must digitally sign the contract to proceed."}
              </p>
            )}

            {isInfluencer && ["ACTIVE", "PAYMENT_HELD"].includes(dealStatus) && (
              <p className="text-sm font-semibold text-foreground">
                Escrow secured! Please create your content and submit drafts for brand review.
              </p>
            )}

            {isInfluencer && dealStatus === "REVISION_REQUESTED" && (
              <p className="text-sm font-semibold text-pending flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Brand requested revisions. Check deliverable notes and upload revised drafts.
              </p>
            )}

            {isInfluencer && dealStatus === "CONTENT_SUBMITTED" && (
              <p className="text-sm font-semibold text-primary">
                Drafts submitted! Brand is currently evaluating your deliverables.
              </p>
            )}

            {isInfluencer && dealStatus === "CONTENT_APPROVED" && (
              <p className="text-sm font-semibold text-foreground">
                Drafts approved! Publish live on your account and submit the live post URL.
              </p>
            )}

            {isInfluencer && ["POSTED", "VERIFICATION_PENDING", "VERIFIED"].includes(dealStatus) && (
              <p className="text-sm font-semibold text-foreground">
                Live URL submitted! Waiting for brand verification and final escrow payout release.
              </p>
            )}

            {isBrand && ["ACTIVE", "PAYMENT_HELD"].includes(dealStatus) && (
              <p className="text-sm font-semibold text-foreground">
                Escrow funds locked. Creator has been notified to produce deliverables.
              </p>
            )}

            {isBrand && dealStatus === "CONTENT_SUBMITTED" && (
              <p className="text-sm font-semibold text-foreground">
                Creator has submitted content drafts. Please review and approve or request revisions.
              </p>
            )}

            {isBrand && dealStatus === "REVISION_REQUESTED" && (
              <p className="text-sm font-semibold text-pending">
                Revision requested. Waiting for Creator to submit revised draft content.
              </p>
            )}

            {isBrand && dealStatus === "CONTENT_APPROVED" && (
              <p className="text-sm font-semibold text-foreground">
                Content approved. Creator is now publishing the approved deliverable live.
              </p>
            )}

            {isBrand && ["POSTED", "VERIFICATION_PENDING", "VERIFIED"].includes(dealStatus) && (
              <p className="text-sm font-semibold text-foreground">
                Live post submitted by Creator. Verify the live post and release the escrow payout.
              </p>
            )}

            {dealStatus === "COMPLETED" && (
              <p className="text-sm font-semibold text-verified flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Deal completed and payment settled successfully.
              </p>
            )}

            {dealStatus === "DISPUTED" && (
              <p className="text-sm font-semibold text-disputed flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Deal is in mediation. Normal actions are paused pending VyaparMedia review.
              </p>
            )}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {dealStatus === "PENDING_SIGNATURE" && !userHasSigned && (
            <Button
              variant="primary"
              onClick={handleSignContract}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              Sign Contract
            </Button>
          )}

          {dealStatus === "PENDING_SIGNATURE" && isInfluencer && !userHasSigned && (
            <Button
              variant="danger"
              onClick={handleRejectInvite}
              disabled={isSubmitting}
            >
              Reject Invite
            </Button>
          )}

          {isInfluencer && ["ACTIVE", "PAYMENT_HELD", "REVISION_REQUESTED"].includes(dealStatus) && (
            <Button
              variant="primary"
              onClick={() => {
                const latestSub = deal?.contentSubmissions?.[0];
                const prevUrls: Record<string, string> = {};
                if (latestSub?.contentUrls && Array.isArray(latestSub.contentUrls)) {
                  latestSub.contentUrls.forEach((item: ContentUrlEntry) => {
                    prevUrls[item.type] = item.url || "";
                  });
                }
                setItemizedUrls(prevUrls);
                setContentForm({
                  contentUrl: latestSub?.contentUrl || "",
                  notes: latestSub?.notes || "",
                });
                setShowSubmitModal(true);
              }}
              disabled={!canSubmitContent || isSubmitting}
              className="gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              {dealStatus === "REVISION_REQUESTED" ? "Re-submit Content" : "Submit Content"}
            </Button>
          )}

          {isInfluencer && dealStatus === "CONTENT_APPROVED" && (
            <Button
              variant="primary"
              onClick={() => setShowVerifyModal(true)}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Submit Live Post URL
            </Button>
          )}

          {isBrand && dealStatus === "CONTENT_SUBMITTED" && (
            <Button
              variant="primary"
              onClick={() => {
                const latestSub = deal?.contentSubmissions?.[0];
                const prevReviews: Record<string, { status: "APPROVED" | "REVISION_REQUESTED"; feedback: string }> = {};
                const deliverablesList = getFlatDeliverablesList(deal);
                deliverablesList.forEach((item) => {
                  const existing = latestSub?.contentUrls && Array.isArray(latestSub.contentUrls)
                    ? latestSub.contentUrls.find((urlObj: ContentUrlEntry) => urlObj.type === item.type)
                    : null;
                  prevReviews[item.type] = {
                    status: existing?.status === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
                    feedback: existing?.feedback || "",
                  };
                });
                setItemizedReviews(prevReviews);
                setShowReviewModal(true);
              }}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Review & Approve Content
            </Button>
          )}

          {isBrand && ["POSTED", "VERIFICATION_PENDING", "VERIFIED"].includes(dealStatus) && (
            <Button
              variant="primary"
              onClick={() => {
                if (
                  !confirm(
                    "Release escrow payment to the creator? This marks the deal as COMPLETED and settles funds immediately. This action cannot be reversed."
                  )
                ) {
                  return;
                }
                handleAction("complete_deal");
              }}
              disabled={isSubmitting}
              className="gap-1.5 bg-verified text-primary-foreground hover:opacity-90"
            >
              <DollarSign className="w-4 h-4" />
              Release Escrow Payment
            </Button>
          )}

          {isBrand && !["COMPLETED", "CANCELLED", "DISPUTED"].includes(dealStatus) && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelDeal}
              disabled={isSubmitting}
              className="gap-1 text-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Deal
            </Button>
          )}

          <Button
            href={`/dashboard/messages?deal=${dealId}`}
            variant="secondary"
            className="gap-1.5 text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Messages
          </Button>
        </div>
      </div>
    </div>
  );
}
