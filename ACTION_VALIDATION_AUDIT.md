# Action Validation & Premature-Exposure Audit (VyaparMedia)

> **Standard Enforced:** Every mutating user action follows the **Single-Implementation Rule** and the **Prompt 2–3 UX Pattern**:
> 1. Actions are **never completely hidden** if the user needs to know the feature exists.
> 2. Buttons are **disabled** when prerequisite business conditions fail.
> 3. An inline message/badge/tooltip explains the **exact specific reason** (e.g. *"Wallet balance insufficient — need ₹X more"*, *"Complete PAN tax verification before processing payouts"*).
> 4. A direct **Fix-It CTA** link is provided to unblock the user immediately (e.g., `"Deposit ₹X"`, `"Verify Account"`, `"View Dispute"`).

---

## 1. System-Wide Validation Matrix

| Domain | Action / Trigger | Backend Endpoint & Service | Backend Rejection Reasons | Shared Predicate (`src/lib/action-eligibility.ts`) | Frontend Component | Pre-Check Status & UX Fix | Fix-It CTA |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Wallet** | Payout Withdrawal Request | `POST /api/wallet/payout` & `payout.service.ts` | 1. Wallet frozen (`WALLET_FROZEN`)<br>2. Balance < ₹500 (`MIN_WITHDRAWAL_PAISE`)<br>3. Amount > ₹5,00,000 (`MAX_WITHDRAWAL_PAISE`)<br>4. Amount > Balance (`INSUFFICIENT_BALANCE`)<br>5. Tax compliance missing (`PAN_COMPLIANCE_REQUIRED`)<br>6. Bank account not verified (`BANK_ACCOUNT_NOT_VERIFIED`) | `checkWithdrawalEligibility()` | `src/app/dashboard/wallet/page.tsx` & `FullScreenWithdrawFlow.tsx` | **Protected**: Disabled button with exact shortfall calculation (`need ₹X more`), PAN verification warning, and unverified account locks. | `"Complete PAN Verification"` & `"Verify Account"` |
| **Wallet** | Bank Account Verification | `POST /api/wallet/bank-accounts/verify` | 1. Account already verified (`ALREADY_VERIFIED`)<br>2. RazorpayX penny-drop failure (`PENNY_DROP_FAILED`)<br>3. Account not owned by user (`FORBIDDEN`) | Inline state check | `src/components/dashboard/wallet/BankAccountManager.tsx` | **Protected**: Replaced static "Verified" badge with "Verification Pending" + interactive "Verify via Penny-Drop" button calling `apiClient.wallet.verifyBankAccount`. | `"Verify via Penny-Drop"` |
| **Campaigns** | Campaign Launch / Escrow Lock | `POST /api/campaigns` & `campaign.service.ts` | 1. Brand wallet is frozen (`WALLET_FROZEN`)<br>2. Wallet balance < required escrow (`INSUFFICIENT_BALANCE`)<br>3. Missing deliverables or budget (`INVALID_INPUT`) | `isWalletFrozen` + `isBalanceInsufficient` | `src/app/dashboard/campaigns/create/CreateCampaignClient.tsx` | **Protected**: Publish button disabled with exact shortfall (`Insufficient Balance (Add ₹X)`) and frozen state. Inline banner displays exact breakdown and deposit button. | `"Deposit ₹X"` & `"Contact Support"` |
| **Campaigns** | Apply to Campaign | `POST /api/campaigns/[id]/applications` & `campaign-application.service.ts` | 1. Campaign not active (`CAMPAIGN_NOT_ACTIVE`)<br>2. Application deadline passed (`DEADLINE_PASSED`)<br>3. Max slots filled (`SLOTS_FULL`)<br>4. Creator followers < minimum or > maximum<br>5. Deal > ₹50,000 and KYC Tier < 2 (`KYC_TIER_INSUFFICIENT`)<br>6. Already applied (`ALREADY_APPLIED`)<br>7. Own campaign (`OWN_CAMPAIGN`) | `checkCampaignApplicationEligibility()` | `src/app/dashboard/campaigns/[id]/CampaignDetailClient.tsx` | **Protected**: Apply button disabled when conditions fail with specific inline badge and contextual redirection. | `"Complete KYC Tier-2"` & `"View My Application"` |
| **Campaigns** | Accept & Fund Deal Pitch | `POST /api/campaigns/[id]/applications/[appId]/accept` | 1. Creator follower authenticity score < 40 (`AUTHENTICITY_TOO_LOW`)<br>2. Application already processed (`ALREADY_PROCESSED`)<br>3. Campaign inactive (`CAMPAIGN_NOT_ACTIVE`)<br>4. Campaign slots full (`SLOTS_FULL`) | `checkApplicationAcceptanceEligibility()` | `src/components/dashboard/campaigns/details/ApplicationsList.tsx` | **Protected**: "Accept & Fund Deal" disabled if authenticity score < 40 or slots full, with inline warning badge. | `"Decline"` / Profile Review |
| **Deals & Escrow** | Digitally Sign Deal Contract | `POST /api/deals/[id]/sign` & `contract-engine.ts` | 1. Deal not in `PENDING_SIGNATURE`<br>2. Counterparty or self already signed (`ALREADY_SIGNED`)<br>3. 48-hour signature deadline expired (`DEADLINE_EXPIRED`) | `checkContractSigningEligibility()` | `src/components/dashboard/deals/DealContextualActions.tsx` & `DealContractCard.tsx` | **Protected**: Sign button disabled with specific message if counterparty is pending or deadline expired. | `"View Agreement"` |
| **Deals & Escrow** | Release Escrow Payment | `POST /api/deals/[id]/complete` & `deal.service.ts` | 1. Caller not brand or admin (`UNAUTHORIZED`)<br>2. Active dispute open (`DISPUTED`)<br>3. Deliverable status not verified / posted (`INVALID_STATUS`)<br>4. Live post link missing when post-verification required (`POST_VERIFICATION_REQUIRED`)<br>5. Insufficient escrow reserve | `checkDealEscrowReleaseEligibility()` | `src/components/dashboard/deals/DealContextualActions.tsx` | **Protected**: "Release Escrow Payment" disabled with inline explanation badge and dispute/post-verification link. | `"View Dispute"` / `"Fix"` |
| **Deals & Escrow** | Cancel Deal | `POST /api/deals/[id]/cancel` & `deal.service.ts` | 1. Caller not brand client (`UNAUTHORIZED`)<br>2. Deal already `COMPLETED` or `CANCELLED` (`TERMINAL_STATUS`)<br>3. Active dispute open (`DISPUTED`) | `checkDealCancellationEligibility()` | `src/components/dashboard/deals/DealContextualActions.tsx` | **Protected**: Button remains visible for brand, but disabled during active disputes with reason and link to dispute room. | `"View Dispute"` (`/dashboard/disputes`) |
| **Deals & Deliverables** | Request Deliverable Revision | `POST /api/deals/[id]/revisions` | 1. Revisions used >= `maxRevisionsLimit`<br>2. Extra paid revision with cost <= 0<br>3. Extra revision cost > brand wallet balance<br>4. Brand wallet frozen | `checkRevisionRequestEligibility()` | `src/components/dashboard/deals/DealModals.tsx` | **Protected**: Revision button disabled with cost indicator, shortfall notice, and deposit CTA. | `"Add Funds"` (`/dashboard/wallet?topup=true`) |
| **Deals & Deliverables** | Submit Content Deliverables | `POST /api/deals/[id]/content` | 1. Caller not influencer<br>2. Status not `ACTIVE`, `REVISION_REQUESTED`<br>3. Physical product required but not marked `RECEIVED` (`PRODUCT_NOT_RECEIVED`) | `checkContentSubmissionEligibility()` | `src/components/dashboard/deals/DealContextualActions.tsx` & `ContentSubmissionModal.tsx` | **Protected**: Submit Content button disabled if physical product is still in transit with direct CTA. | `"Confirm Delivery"` |
| **Deals & Deliverables** | Submit Live Post URL | `POST /api/deals/[id]/verify` | 1. Missing or invalid URL format (not starting with http:// or https://)<br>2. Deal not in `CONTENT_APPROVED` | Inline regex validation | `src/components/dashboard/deals/DealModals.tsx` | **Protected**: Verify button disabled until valid URL is entered with toast error guard. | N/A |
| **Logistics** | Provide Shipping Address | `POST /api/deals/[id]/shipping` & `product.ts` | 1. Caller not creator (`UNAUTHORIZED`)<br>2. Product already dispatched (`DISPATCHED_ALREADY`)<br>3. Invalid phone number (not 10-digit Indian)<br>4. Invalid PIN code (not 6-digit)<br>5. Missing street address or city | `checkProductFulfillmentEligibility()` + Form regex | `src/components/dashboard/deals/DealContractCard.tsx` & `DealModals.tsx` | **Protected**: Address button disabled after dispatch; "Save Address" button disabled with inline helper if phone or PIN code format is invalid. | N/A |
| **Logistics** | Confirm Product Dispatch | `POST /api/deals/[id]/dispatch` & `product.ts` | 1. Caller not brand (`UNAUTHORIZED`)<br>2. Escrow payment not secured (`PAYMENT_NOT_SECURED`)<br>3. Creator shipping address missing (`ADDRESS_MISSING`)<br>4. Tracking number missing | `checkProductFulfillmentEligibility()` | `src/components/dashboard/deals/DealContractCard.tsx` & `DealModals.tsx` | **Protected**: "Confirm Dispatch" button visible but disabled until address is provided; inline notice explains missing address. | `"Provide Shipping Address"` |
| **Logistics** | Confirm Product Received | `POST /api/deals/[id]/receive-product` & `product.ts` | 1. Caller not creator (`UNAUTHORIZED`)<br>2. Product not yet dispatched (`NOT_DISPATCHED`) | `checkProductFulfillmentEligibility()` | `src/components/dashboard/deals/DealContractCard.tsx` | **Protected**: "Confirm Received" button visible to creator but disabled until product is dispatched. | N/A |
| **Trust & Safety** | Raise Deal Dispute | `POST /api/disputes` & `dispute.service.ts` | 1. User not participant of deal (`UNAUTHORIZED`)<br>2. Deal already has active dispute (`ACTIVE_DISPUTE_EXISTS`)<br>3. Deal is `COMPLETED` or `CANCELLED`<br>4. Deal is `PENDING_SIGNATURE` or `PAYMENT_PENDING` (no escrow held) | `checkDisputeEligibility()` | `src/app/dashboard/deals/[id]/page.tsx` & `DealDisputeSection.tsx` | **Protected**: "Raise Dispute" button disabled if dispute is already active or deal is in pre-escrow status, with exact inline reason. | `"View Dispute"` |
| **Reviews & Feedback**| Submit Official Review | `POST /api/reviews` & `review.service.ts` | 1. Deal not `COMPLETED` (`DEAL_NOT_COMPLETED`)<br>2. Rating not 1–5 stars (`INVALID_RATING`)<br>3. Review comment contains contact info: phone, email, URLs, IG/WA/Telegram handles, UPI IDs (`CONTACT_INFO_DETECTED`) | `checkReviewSubmissionEligibility()` | `src/app/dashboard/deals/[id]/page.tsx` | **Protected**: "Submit Official Review" button disabled until rating is selected and if contact info is detected in comment, showing inline warning. | N/A |

---

## 2. Shared Predicates File Architecture

All predicates are unified under **[`src/lib/action-eligibility.ts`](file:///c:/Decisional-main/vyaparmedia/src/lib/action-eligibility.ts)**:
- `checkWithdrawalEligibility` (Lines 640–760)
- `checkDealEscrowReleaseEligibility` (Lines 765–843)
- `checkDealCancellationEligibility` (Lines 846–898)
- `checkProductFulfillmentEligibility` (Lines 904–1010)
- `checkApplicationAcceptanceEligibility` (Lines 1016–1075)
- `checkReviewSubmissionEligibility` (Lines 1083–1127)
- `checkCampaignApplicationEligibility` (Lines 513–640)
- `checkRevisionRequestEligibility` (Lines 105–170)
- `checkContentSubmissionEligibility` (Lines 20–73)
- `checkContractSigningEligibility` (Lines 79–99)
- `checkDisputeEligibility` (Lines 220–320)

---

## 3. Key UX Gaps Fixed in This Pass

1. **Escrow Release Premature Exposure**:
   - Previously: Brand saw "Release Escrow Payment" which threw 400 if deliverables weren't verified or an active dispute was open.
   - Now: Button is disabled with amber warning badge and direct link to dispute or deliverable verification.

2. **Deal Cancellation Blockers**:
   - Previously: "Cancel Deal" button was hidden during disputes, confusing users who wondered why they couldn't cancel.
   - Now: Button remains visible in disabled state with clear warning: *"Cannot cancel a deal while an active dispute is open. Please resolve the dispute first."* with link to dispute room.

3. **Product Seeding Gaps**:
   - Previously: If brand opened product section before creator submitted address, "Confirm Dispatch" was hidden without explanation.
   - Now: "Confirm Dispatch" is visible and disabled with message: *"Creator shipping address is required before the product can be dispatched."*
   - Creator sees "Confirm Received" disabled with: *"Product must be marked as dispatched before receipt can be confirmed."*

4. **Shipping Address Format Guard**:
   - Previously: Submitting malformed phone numbers or PIN codes triggered backend 400 `AppError.badRequest`.
   - Now: Address modal validates Indian phone (`/^[6-9]\d{9}$/`) and 6-digit PIN code (`/^\d{6}$/`) upfront, disabling "Save Address" with inline error helper.

5. **Creator Authenticity Gate**:
   - Previously: "Accept & Fund Deal" button in application lists allowed clicking on creators with low authenticity scores (< 40), failing at backend.
   - Now: Pre-checked via `checkApplicationAcceptanceEligibility`, disabling the button with score warning.

6. **Review Submission Integrity**:
   - Previously: Users typing phone numbers, emails, handles, or UPI IDs in review text received a backend rejection upon submit.
   - Now: Preemptively validated using `checkReviewSubmissionEligibility`, displaying real-time warning: *"Contact details (phone numbers, emails, links, handles, or UPI) are not permitted in review comments."*

7. **Frozen Brand Wallet Protection**:
   - Previously: A frozen brand could fill out the 3-step campaign wizard and click "Launch Campaign & Lock Escrow", only to encounter an API error.
   - Now: Step 3 live-checks `walletData?.isFrozen` and displays a high-priority banner with link to `/dashboard/support`, disabling the launch button.
