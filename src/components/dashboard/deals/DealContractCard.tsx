"use client";

import React from "react";
import { Card } from "@/components/ui";
import { CheckCircle2, Clock, Package, Truck } from "lucide-react";
import {
  DealDetail,
  parseContractTerms,
  formatContractDate,
  getIncludedRevisions,
} from "./DealDetailHelpers";

interface DealContractCardProps {
  readonly deal: DealDetail;
  readonly isBrand?: boolean;
  readonly isInfluencer?: boolean;
  readonly onOpenAddressModal?: () => void;
  readonly onOpenDispatchModal?: () => void;
  readonly onConfirmReceived?: () => void;
  readonly isSubmitting?: boolean;
}

export function DealContractCard({
  deal,
  isBrand = false,
  isInfluencer = false,
  onOpenAddressModal,
  onOpenDispatchModal,
  onConfirmReceived,
  isSubmitting = false,
}: Readonly<DealContractCardProps>) {
  const contractTerms = parseContractTerms(deal.contractTerms);
  const terms = contractTerms;
  const requiresProduct = Boolean(deal.requiresProduct || terms?.requiresProduct);
  const status = deal.productFulfillmentStatus || "NOT_REQUIRED";
  const tracking = deal.dispatchTrackingNumber || deal.trackingNumber;
  const carrier = deal.dispatchCarrier || deal.carrier;

  return (
    <Card className="p-6 rounded-2xl border border-border bg-card shadow-sm transition-colors">
      <h3 className="font-heading font-bold text-lg text-foreground mb-4">Contract Terms</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-sm text-foreground mb-2">Obligations & Deliverables</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            {requiresProduct && (
              <div>
                <strong className="text-foreground">Requires Product Seeding:</strong> Yes
              </div>
            )}
            <div>
              <strong className="text-foreground">Included Revisions:</strong> {getIncludedRevisions(terms, deal)}
            </div>
            {terms?.mandatoryElements && (
              <div>
                <strong className="text-foreground">Mandatory Elements:</strong>{" "}
                {Array.isArray(terms.mandatoryElements) ? terms.mandatoryElements.join(", ") : String(terms.mandatoryElements)}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-2">Timeline & Execution</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            <div>
              <strong className="text-foreground">Submission Deadline:</strong> {formatContractDate(terms?.submissionDeadline)}
            </div>
            <div>
              <strong className="text-foreground">Posting Deadline:</strong> {formatContractDate(terms?.postingDeadline)}
            </div>
            <div>
              <strong className="text-foreground">Review Window:</strong> {typeof terms?.reviewPeriodHours === "number" ? terms.reviewPeriodHours : 48} hours
            </div>
          </div>
        </div>
      </div>

      {/* Digital Signatures Stamp Section */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="font-semibold text-sm text-foreground mb-3">Digital Signatures</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Brand Signature ({deal.brand?.companyName || "Brand"})</span>
            {deal.brandSignedAt ? (
              <span className="text-verified font-semibold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-verified shrink-0" /> Signed on {formatContractDate(deal.brandSignedAt)}
              </span>
            ) : (
              <span className="text-pending font-medium flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-pending shrink-0" /> Pending Signature
              </span>
            )}
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Creator Signature ({deal.influencer?.displayName || "Influencer"})</span>
            {deal.influencerSignedAt ? (
              <span className="text-verified font-semibold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-verified shrink-0" /> Signed on {formatContractDate(deal.influencerSignedAt)}
              </span>
            ) : (
              <span className="text-pending font-medium flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-pending shrink-0" /> Pending Signature
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Product Seeding Section */}
      {requiresProduct && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <strong className="text-foreground">Product Seeding:</strong>{" "}
              <span className="font-semibold text-primary">
                {status.replaceAll("_", " ")}
              </span>
              {tracking && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  (Tracking: {tracking}{carrier ? ` via ${carrier}` : ""})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenAddressModal && (
                <button
                  type="button"
                  onClick={onOpenAddressModal}
                  className="text-xs text-primary underline hover:opacity-80 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  {deal.shippingAddress ? "View / Update Address" : "Provide Shipping Address"}
                </button>
              )}

              {isBrand && status === "READY_TO_DISPATCH" && onOpenDispatchModal && (
                <button
                  type="button"
                  onClick={onOpenDispatchModal}
                  disabled={isSubmitting}
                  className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Confirm Product Dispatch
                </button>
              )}

              {isInfluencer && status === "DISPATCHED" && onConfirmReceived && (
                <button
                  type="button"
                  onClick={onConfirmReceived}
                  disabled={isSubmitting}
                  className="text-xs bg-verified text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Product Received
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
