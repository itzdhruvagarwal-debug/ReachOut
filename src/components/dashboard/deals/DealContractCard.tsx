import { Card } from "@/components/ui";
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
    <Card className="card p-6">
      <h3 className="font-bold text-lg mb-4">Contract Terms</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Obligations & Deliverables</h4>
          <div className="text-sm text-secondary">
            {requiresProduct && (
              <div className="mb-2">
                <strong>Requires Product Seeding:</strong> Yes
              </div>
            )}
            <div className="mb-2">
              <strong>Included Revisions:</strong> {getIncludedRevisions(terms, deal)}
            </div>
            {terms?.mandatoryElements && (
              <div className="mb-2">
                <strong>Mandatory Elements:</strong> {Array.isArray(terms.mandatoryElements) ? terms.mandatoryElements.join(', ') : String(terms.mandatoryElements)}
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Timeline & Execution</h4>
          <div className="text-sm text-secondary">
            <div className="mb-2">
              <strong>Submission Deadline:</strong> {formatContractDate(terms?.submissionDeadline)}
            </div>
            <div className="mb-2">
              <strong>Posting Deadline:</strong> {formatContractDate(terms?.postingDeadline)}
            </div>
            <div className="mb-2">
              <strong>Review Window:</strong> {typeof terms?.reviewPeriodHours === "number" ? terms.reviewPeriodHours : 48} hours
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="font-semibold mb-3">Digital Signatures</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg border border-border bg-card/40 flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium">Brand Signature ({deal.brand?.companyName || "Brand"})</span>
            {deal.brandSignedAt ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <span>✓</span> Signed on {formatContractDate(deal.brandSignedAt)}
              </span>
            ) : (
              <span className="text-amber-500 font-medium flex items-center gap-1.5">
                <span>⏳</span> Pending Signature
              </span>
            )}
          </div>
          <div className="p-3 rounded-lg border border-border bg-card/40 flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium">Creator Signature ({deal.influencer?.displayName || "Influencer"})</span>
            {deal.influencerSignedAt ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <span>✓</span> Signed on {formatContractDate(deal.influencerSignedAt)}
              </span>
            ) : (
              <span className="text-amber-500 font-medium flex items-center gap-1.5">
                <span>⏳</span> Pending Signature
              </span>
            )}
          </div>
        </div>
      </div>

      {requiresProduct && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <strong>Product Seeding:</strong>{" "}
              <span className="font-semibold text-primary">
                {status.replaceAll("_", " ")}
              </span>
              {tracking && (
                <span className="ml-2 text-xs text-secondary">
                  (Tracking: {tracking}{carrier ? ` via ${carrier}` : ""})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenAddressModal && (
                <button
                  type="button"
                  onClick={onOpenAddressModal}
                  className="text-xs text-primary underline hover:opacity-80 font-medium cursor-pointer"
                >
                  📦 {deal.shippingAddress ? "View / Update Address" : "Provide Shipping Address"}
                </button>
              )}

              {isBrand && status === "READY_TO_DISPATCH" && onOpenDispatchModal && (
                <button
                  type="button"
                  onClick={onOpenDispatchModal}
                  disabled={isSubmitting}
                  className="text-xs bg-primary text-white px-2.5 py-1 rounded font-medium hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  🚚 Confirm Product Dispatch
                </button>
              )}

              {isInfluencer && status === "DISPATCHED" && onConfirmReceived && (
                <button
                  type="button"
                  onClick={onConfirmReceived}
                  disabled={isSubmitting}
                  className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  ✅ Confirm Product Received
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
