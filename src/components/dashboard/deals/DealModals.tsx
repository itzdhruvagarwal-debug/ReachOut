"use client";

import React from "react";
import { Modal, Button, Input, Textarea, type ToastType } from "@/components/ui";
import { DealDetail, getFlatDeliverablesList, ContentUrlEntry } from "./DealDetailHelpers";

interface DealModalsProps {
  readonly showAddressModal: boolean;
  readonly setShowAddressModal: (open: boolean) => void;
  readonly showReviewModal: boolean;
  readonly setShowReviewModal: (open: boolean) => void;
  readonly showVerifyModal: boolean;
  readonly setShowVerifyModal: (open: boolean) => void;
  readonly showDispatchModal?: boolean;
  readonly setShowDispatchModal?: (open: boolean) => void;
  readonly deal: DealDetail | null;
  readonly shippingForm: { fullName: string; phone: string; line1: string; line2: string; city: string; state: string; pinCode: string; country: string };
  readonly setShippingForm: React.Dispatch<React.SetStateAction<{ fullName: string; phone: string; line1: string; line2: string; city: string; state: string; pinCode: string; country: string }>>;
  readonly dispatchForm?: { trackingNumber: string; carrier: string };
  readonly setDispatchForm?: React.Dispatch<React.SetStateAction<{ trackingNumber: string; carrier: string }>>;
  readonly postUrl: string;
  readonly setPostUrl: (val: string) => void;
  readonly isSubmitting: boolean;
  readonly handleAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
  readonly handleProductAction?: (payload: Record<string, unknown>) => Promise<boolean>;
  readonly showToast: (type: ToastType, message: string) => void;
  readonly handleReviewContent: () => Promise<void>;
  readonly itemizedReviews: Record<string, { status: "APPROVED" | "REVISION_REQUESTED"; feedback: string }>;
  readonly setItemizedReviews: React.Dispatch<React.SetStateAction<Record<string, { status: "APPROVED" | "REVISION_REQUESTED"; feedback: string }>>>;
}

export function DealModals({
  showAddressModal,
  setShowAddressModal,
  showReviewModal,
  setShowReviewModal,
  showVerifyModal,
  setShowVerifyModal,
  showDispatchModal = false,
  setShowDispatchModal,
  deal,
  shippingForm,
  setShippingForm,
  dispatchForm,
  setDispatchForm,
  postUrl,
  setPostUrl,
  isSubmitting,
  handleAction,
  handleProductAction,
  showToast,
  handleReviewContent,
  itemizedReviews,
  setItemizedReviews,
}: DealModalsProps) {
if (!deal) return null;

return (
<>
<Modal
open={showAddressModal}
onClose={() => setShowAddressModal(false)}
title="Shipping Address"
maxWidth="500px"
>
<div className="grid gap-3 mb-4 grid-cols-1 sm:grid-cols-2">
{([
["fullName", "Full name"],
["phone", "Phone"],
["line1", "Address line 1"],
["line2", "Address line 2"],
["city", "City"],
["state", "State"],
["pinCode", "PIN code"],
] as const).map(([field, label]) => {
const isFullWidth = ["line1", "line2", "fullName"].includes(field);
const addressRecord = (typeof deal.shippingAddress === "object" && deal.shippingAddress !== null && !Array.isArray(deal.shippingAddress)) ? (deal.shippingAddress as Record<string, unknown>) : null;
const isEditing = ["PENDING_SIGNATURE", "PAYMENT_HELD", "ACTIVE"].includes(deal.status);

return (
<div
key={field}
className={isFullWidth ? "col-span-2" : "col-span-1"}
>
{isEditing ? (
<Input
label={label}
id={`shipping-${field}`}
value={shippingForm[field]}
onChange={(e) =>
setShippingForm({
...shippingForm,
[field]: e.target.value,
})
}
fullWidth
/>
) : (
<div>
<div className="text-xs text-secondary">{label}</div>
<div className="font-semibold text-sm">
{typeof addressRecord?.[field] === "string" && addressRecord[field] ? String(addressRecord[field]) : "Not provided"}
</div>
</div>
)}
</div>
);
})}
</div>

<div className="flex gap-3">
<Button
variant="secondary"
onClick={() => setShowAddressModal(false)}
className="flex-1"
>
Close
</Button>
{["PENDING_SIGNATURE", "PAYMENT_HELD", "ACTIVE"].includes(deal.status) && (
<Button
variant="primary"
onClick={async () => {
await handleAction("update_shipping", {
shippingAddress: shippingForm,
});
setShowAddressModal(false);
}}
disabled={isSubmitting}
className="flex-1"
>
Save Address
</Button>
)}
</div>
</Modal>

<Modal
open={showReviewModal}
onClose={() => setShowReviewModal(false)}
title="Review Content"
maxWidth="600px"
>
<div
className="mb-5 flex flex-col gap-4 overflow-y-auto deal-modal-scroll-container"
>
{getFlatDeliverablesList(deal).map((item) => {
const latestSub = deal?.contentSubmissions?.[0];
const existing = latestSub?.contentUrls && Array.isArray(latestSub.contentUrls)
? latestSub.contentUrls.find((u: ContentUrlEntry) => u.type === item.type)
: null;
const itemReview = itemizedReviews[item.type] || {
status: "APPROVED",
feedback: "",
};

return (
<div
key={item.type}
className="p-3 border-card rounded-md bg-secondary flex flex-col gap-3"
>
<div className="flex justify-between items-center">
<div className="font-semibold">{item.label}</div>
{existing ? (
<a
href={existing.url}
target="_blank"
rel="noopener noreferrer"
className="text-xs text-primary font-bold hover:underline"
>
View Submission
</a>
) : (
<span className="text-xs text-muted">No submission</span>
)}
</div>

<div className="flex justify-between items-center gap-3">
<div className="text-xs text-secondary">Decision:</div>
<div className="flex gap-2">
<Button
variant={
itemReview.status === "APPROVED"
? "primary"
: "secondary"
}
size="sm"
onClick={() =>
setItemizedReviews({
...itemizedReviews,
[item.type]: { ...itemReview, status: "APPROVED" },
})
}
className="text-xs py-1"
>
Approve
</Button>
<Button
variant={
itemReview.status === "REVISION_REQUESTED"
? "danger"
: "secondary"
}
size="sm"
onClick={() =>
setItemizedReviews({
...itemizedReviews,
[item.type]: {
...itemReview,
status: "REVISION_REQUESTED",
},
})
}
className="text-xs py-1"
>
Revision
</Button>
</div>
</div>

{itemReview.status === "REVISION_REQUESTED" && (
<div className="mt-2">
<Textarea
rows={2}
placeholder="What needs to change for this specific deliverable?"
aria-label={`Revision details for ${item.label}`}
value={itemReview.feedback}
onChange={(e) =>
setItemizedReviews({
...itemizedReviews,
[item.type]: { ...itemReview, feedback: e.target.value },
})
}
className="text-xs p-2"
/>
</div>
)}
</div>
);
})}
</div>

<div className="flex gap-3">
<Button
variant="secondary"
onClick={() => setShowReviewModal(false)}
className="flex-1"
>
Cancel
</Button>
<Button
variant="primary"
onClick={handleReviewContent}
disabled={isSubmitting}
className="flex-1"
>
{isSubmitting ? <span className="loading" /> : "Submit Review"}
</Button>
</div>
</Modal>

<Modal
open={showVerifyModal}
onClose={() => setShowVerifyModal(false)}
title="Verify Post"
maxWidth="500px"
>
<div className="mb-5">
<Input
label="Live Post URL *"
id="live-post-url-input"
type="url"
placeholder="https://instagram.com/p/..."
value={postUrl}
onChange={(e) => setPostUrl(e.target.value)}
fullWidth
/>
</div>
<div className="p-3 mb-5 text-sm text-secondary bg-tertiary rounded-md">
Ensure required hashtags are present.
</div>
<div className="flex gap-3">
<Button
variant="secondary"
onClick={() => setShowVerifyModal(false)}
className="flex-1"
>
Cancel
</Button>
<Button
variant="primary"
onClick={() => {
  if (!postUrl.trim()) return;
  if (!/^https?:\/\//i.test(postUrl.trim())) {
    showToast("error", "Please enter a valid URL starting with http:// or https://");
    return;
  }
  handleAction("verify_post", { postUrl: postUrl.trim() });
}}
disabled={isSubmitting || !postUrl}
className="flex-1"
>
{isSubmitting ? <span className="loading" /> : "Verify"}
</Button>
</div>
</Modal>

{setShowDispatchModal && dispatchForm && setDispatchForm && handleProductAction && (
  <Modal
    open={showDispatchModal}
    onClose={() => setShowDispatchModal(false)}
    title="Confirm Product Dispatch"
    maxWidth="500px"
  >
    <div className="mb-4 space-y-3">
      <p className="text-xs text-secondary">
        Enter the courier tracking details after shipping the required product to the creator.
      </p>
      <Input
        label="Tracking / AWB Number *"
        id="dispatch-tracking-input"
        type="text"
        placeholder="e.g. 1234567890"
        value={dispatchForm.trackingNumber}
        onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
        fullWidth
      />
      <Input
        label="Courier / Carrier Partner"
        id="dispatch-carrier-input"
        type="text"
        placeholder="e.g. BlueDart, Delhivery, DTDC, India Post"
        value={dispatchForm.carrier}
        onChange={(e) => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
        fullWidth
      />
    </div>
    <div className="flex gap-3">
      <Button
        variant="secondary"
        onClick={() => setShowDispatchModal(false)}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          if (!dispatchForm.trackingNumber.trim()) {
            showToast("error", "Please enter a valid tracking number");
            return;
          }
          handleProductAction({
            action: "confirm_dispatch",
            trackingNumber: dispatchForm.trackingNumber.trim(),
            carrier: dispatchForm.carrier.trim() || undefined,
          });
        }}
        disabled={isSubmitting || !dispatchForm.trackingNumber.trim()}
        className="flex-1"
      >
        {isSubmitting ? <span className="loading" /> : "Confirm Dispatch"}
      </Button>
    </div>
  </Modal>
)}
</>
);
}
