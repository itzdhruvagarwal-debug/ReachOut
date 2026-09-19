# VyaparMedia User Messaging & Error Handling Guidelines (`MESSAGES.md`)

## 1. Core Principles

1. **Zero Technical Leaks**:
   - Stack traces, database column names, table names, SQL keywords, and internal microservice names must **never** be exposed in the UI.
   - Raw technical exceptions belong solely in structured server logs (`logger.error` / `logger.warn`).
2. **Consistent, Polite & Professional Tone**:
   - Tone is polite, clear, respectful, and reassuring.
   - Avoid robotic phrasing (e.g. `ERR_500: Internal server failure occurred`), accusatory tones (e.g. `You entered invalid data`), or overly informal slang.
3. **Actionability Over Ambiguity**:
   - Every error state should explain **what happened** and suggest **what to do next** (e.g., "Try again", "Refresh page", "Check bank details", or "Contact support").
4. **Informative & Specific Success States**:
   - Success messages must never be generic "Success!". They should provide concrete details (e.g., settlement timeframes, background verification steps, next milestone).

---

## 2. Standardized Message Catalog

### A. Authentication & Account Security
| Scenario | User-Facing Message | Suggested Action |
| :--- | :--- | :--- |
| **Session Expired (401)** | "Your session has expired. Please sign in again to continue." | Sign In |
| **Permission Denied (403)** | "You don't have permission to perform this action. If you believe this is an error, please reach out to support." | Contact Support |
| **Rate Limit Exceeded (429)** | "Too many attempts detected. For your account security, please wait a moment before trying again." | Wait & Retry |
| **Invalid / Expired OTP** | "The OTP entered is incorrect or has expired. Please request a new code and try again." | Resend Code |
| **Expired Reset Link** | "This password reset link has expired or has already been used. Please request a fresh link." | Request Link |
| **Password Changed** | "Password updated successfully. For your security, other active sessions have been signed out." | None |

### B. Wallet, Payments & Escrow
| Scenario | User-Facing Message | Suggested Action |
| :--- | :--- | :--- |
| **Insufficient Balance** | "Your available balance is insufficient for this request. Please review your wallet balance." | View Wallet |
| **Withdrawal Limits** | "Withdrawal must be between ₹500 and ₹5,00,000 per transaction." | Adjust Amount |
| **Gateway Timeout / Ambiguous** | "The payment gateway is taking longer than expected to confirm. Please check your transaction history before initiating a new request." | Check History |
| **Bank Account Verification** | "We couldn't verify this bank account. Please ensure the account number and IFSC code are correct." | Verify Details |
| **Withdrawal Submitted** | "Withdrawal request submitted successfully. Funds will reflect in your bank account within 2-3 business days." | View History |
| **Bank Account Added** | "Bank account saved. Verification penny-drop initiated and will confirm shortly." | Done |

### C. Deals & Deliverables
| Scenario | User-Facing Message | Suggested Action |
| :--- | :--- | :--- |
| **State Conflict / Stale Deal** | "This deal state has updated or this action is no longer permitted. Please refresh the deal details." | Refresh Deal |
| **Deliverables Submitted** | "Deliverables submitted successfully! The brand will review your content." | View Deal |
| **Contract Signed** | "Contract signed successfully. The deal is now active." | View Deal |
| **Dispute Lodged** | "Dispute opened. Our moderation team will review evidence within 24-48 hours." | Track Dispute |

### D. System & Network
| Scenario | User-Facing Message | Suggested Action |
| :--- | :--- | :--- |
| **Offline / Network Drop** | "Unable to connect right now. Please check your internet connection and try again." | Try Again |
| **Internal Server Error (500)** | "We encountered a temporary processing issue. Our team has been notified. Please try again shortly." | Try Again |
| **File Upload Too Large** | "File upload failed. Please ensure your file is under the allowed size limit and in a supported format." | Select File |

---

## 3. Developer Usage Guide

### Using `formatUserError` in Components:
```typescript
import { formatUserError } from "@/lib/user-messages";

try {
  await apiClient.wallet.withdraw(...);
} catch (err: unknown) {
  const userMessage = formatUserError(err, "Failed to submit withdrawal request.");
  showToast("error", userMessage);
}
```

### Using `getUserFriendlyErrorMessage` with Action Buttons:
```typescript
import { getUserFriendlyErrorMessage } from "@/lib/user-messages";

try {
  await executeAction();
} catch (err: unknown) {
  const { message, actionText, actionType } = getUserFriendlyErrorMessage(err);
  setErrorDisplay({ message, actionText, actionType });
}
```

### Using Specific Success Messages:
```typescript
import { USER_SUCCESS_MESSAGES } from "@/lib/user-messages";

showToast("success", USER_SUCCESS_MESSAGES.WITHDRAWAL_SUBMITTED);
```
