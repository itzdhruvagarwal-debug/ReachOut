/**
 * Centralized User-Facing Message Architecture & Error Sanitization Engine
 *
 * Enforces:
 * 1. Zero leakage of stack traces, DB columns, table names, or internal service identifiers.
 * 2. Consistent, polite, empathetic, and actionable tone.
 * 3. Clear next-actions (Retry, Refresh, Login, Contact Support) on all error states.
 * 4. Specific, informative success messaging.
 */

import { ApiClientError } from "@/lib/api-client/errors";

export type UserActionType = "RETRY" | "REFRESH" | "LOGIN" | "SUPPORT" | "DISMISS";

export interface UserMessageResult {
  message: string;
  actionText?: string;
  actionType?: UserActionType;
}

/**
 * Patterns matching database, framework, or internal tech infrastructure leaks.
 * If any of these match, the raw message must NEVER be displayed to the user.
 */
const TECHNICAL_LEAK_PATTERNS: RegExp[] = [
  /\bprisma\b/i,
  /\bp20\d\d\b/i,
  /\bpostgres(?:ql)?\b/i,
  /\bforeign key\b/i,
  /\bconstraint\b/i,
  /\bunique constraint\b/i,
  /\bselect\b.*\bfrom\b/i,
  /\binsert into\b/i,
  /\bupdate\b.*\bset\b/i,
  /\bdelete from\b/i,
  /\btable\s+"?[a-zA-Z0-9_]+"?/i,
  /\bcolumn\s+"?[a-zA-Z0-9_]+"?/i,
  /\bnode_modules\b/i,
  /\bat\s+[a-zA-Z0-9_.]+\s+\(/i,
  /\bstack\b/i,
  /\bobject Object\b/i,
  /\bECONNREFUSED\b/i,
  /\bETIMEDOUT\b/i,
  /\bENOTFOUND\b/i,
  /\bInvariant Violation\b/i,
  /\bUnhandled error\b/i,
  /\bInternal Server Error\b/i,
];

/**
 * Maps known error codes, keywords, or status codes to friendly, actionable messages.
 */
interface ErrorMappingRule {
  match: (code: string, text: string, status?: number) => boolean;
  result: UserMessageResult;
}

const ERROR_MAPPING_RULES: ErrorMappingRule[] = [
  // 1. Network & Connectivity
  {
    match: (_, text, status) =>
      status === 0 ||
      /\b(?:fetch failed|failed to fetch|network error|network request failed|connection refused)\b/i.test(text),
    result: {
      message: "Unable to connect right now. Please check your internet connection and try again.",
      actionText: "Try Again",
      actionType: "RETRY",
    },
  },

  // 2. Authentication & Session Expiry
  {
    match: (code, text, status) =>
      status === 401 ||
      code === "UNAUTHORIZED" ||
      /\b(?:unauthorized|session expired|jwt expired|token expired|login required)\b/i.test(text),
    result: {
      message: "Your session has expired. Please sign in again to continue.",
      actionText: "Sign In",
      actionType: "LOGIN",
    },
  },

  // 3. Authorization & Permissions
  {
    match: (code, text, status) =>
      status === 403 ||
      code === "FORBIDDEN" ||
      /\b(?:forbidden|permission denied|not authorized|access denied)\b/i.test(text),
    result: {
      message: "You don't have permission to perform this action. If you believe this is an error, please reach out to support.",
      actionText: "Contact Support",
      actionType: "SUPPORT",
    },
  },

  // 4. Rate Limiting & Too Many Requests
  {
    match: (code, text, status) =>
      status === 429 ||
      code === "RATE_LIMIT" ||
      /\b(?:too many requests|rate limit|too many attempts)\b/i.test(text),
    result: {
      message: "Too many attempts detected. For your account security, please wait a moment before trying again.",
      actionText: "Wait & Retry",
      actionType: "RETRY",
    },
  },

  // 5. Duplicate / Conflict
  {
    match: (code, text, status) =>
      status === 409 ||
      code === "CONFLICT" ||
      /\b(?:already exists|duplicate entry|unique constraint|record already exists)\b/i.test(text),
    result: {
      message: "This entry already exists or is currently in use. Please review your details and try again.",
      actionText: "Review Details",
      actionType: "RETRY",
    },
  },

  // 6. Resource Not Found
  {
    match: (code, text, status) =>
      status === 404 ||
      code === "NOT_FOUND" ||
      /\b(?:not found|does not exist|item missing|deal not found|user not found)\b/i.test(text),
    result: {
      message: "The requested item could not be found or may have been updated.",
      actionText: "Refresh Page",
      actionType: "REFRESH",
    },
  },

  // 7. OTP / Verification Code Errors
  {
    match: (_, text) =>
      /\b(?:invalid.*otp|incorrect.*otp|otp.*expired|invalid.*code|verification.*failed|otp.*corrupted)\b/i.test(text),
    result: {
      message: "The OTP entered is incorrect or has expired. Please request a new code and try again.",
      actionText: "Resend Code",
      actionType: "RETRY",
    },
  },

  // 8. Password Recovery & Reset Links
  {
    match: (_, text) =>
      /\b(?:invalid or expired token|reset token|password reset link)\b/i.test(text),
    result: {
      message: "This password reset link has expired or has already been used. Please request a fresh link.",
      actionText: "Request Link",
      actionType: "RETRY",
    },
  },

  // 9. Wallet & Insufficient Balance
  {
    match: (_, text) =>
      /\b(?:insufficient.*balance|insufficient.*funds|exceeds.*available balance)\b/i.test(text),
    result: {
      message: "Your available balance is insufficient for this request. Please review your wallet balance.",
      actionText: "View Wallet",
      actionType: "REFRESH",
    },
  },

  // 10. Withdrawal Limits
  {
    match: (_, text) =>
      /\b(?:minimum withdrawal|maximum.*single withdrawal)\b/i.test(text),
    result: {
      message: "Withdrawal must be between ₹500 and ₹5,00,000 per transaction.",
      actionText: "Adjust Amount",
      actionType: "RETRY",
    },
  },

  // 11. Payment Gateway Timeout / Pending
  {
    match: (code, text) =>
      code === "GATEWAY_TIMEOUT" ||
      code === "GATEWAY_AMBIGUOUS" ||
      /\b(?:gateway timeout|payment pending|gateway ambiguous)\b/i.test(text),
    result: {
      message: "The payment gateway is taking longer than expected to confirm. Please check your transaction history before initiating a new request.",
      actionText: "Check History",
      actionType: "REFRESH",
    },
  },

  // 12. Bank Account & Penny-Drop Verification
  {
    match: (_, text) =>
      /\b(?:bank account|ifsc|penny-drop|beneficiary)\b/i.test(text),
    result: {
      message: "We couldn't verify this bank account. Please ensure the account number and IFSC code are correct.",
      actionText: "Verify Details",
      actionType: "RETRY",
    },
  },

  // 13. File Upload & Storage
  {
    match: (code, text) =>
      code === "FILE_TOO_LARGE" ||
      /\b(?:upload failed|storage|payload too large|file size|unsupported file)\b/i.test(text),
    result: {
      message: "File upload failed. Please ensure your file is under the allowed size limit and in a supported format.",
      actionText: "Select File",
      actionType: "RETRY",
    },
  },

  // 14. Deal Action & State Transitions
  {
    match: (_, text) =>
      /\b(?:transition|invalid deal|deal lifecycle|not permitted for role|terminal state)\b/i.test(text),
    result: {
      message: "This deal state has updated or this action is no longer permitted. Please refresh the deal details.",
      actionText: "Refresh Deal",
      actionType: "REFRESH",
    },
  },

  // 15. Server & Generic Database Fallback
  {
    match: (_, _text, status) => status !== undefined && status >= 500,
    result: {
      message: "We encountered a temporary processing issue. Our team has been notified. Please try again shortly.",
      actionText: "Try Again",
      actionType: "RETRY",
    },
  },
];

/**
 * Parses any incoming error into a clean, sanitized UserMessageResult.
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again.",
): UserMessageResult {
  let rawText = "";
  let statusCode: number | undefined;
  let errorCode = "UNKNOWN";

  if (error instanceof ApiClientError) {
    statusCode = error.status;
    errorCode = error.code || "UNKNOWN";
    rawText = error.message || "";
  } else if (error instanceof Error) {
    rawText = error.message || "";
  } else if (typeof error === "string") {
    rawText = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") {
      rawText = errObj.message;
    }
    if (typeof errObj.code === "string") {
      errorCode = errObj.code;
    }
    if (typeof errObj.status === "number") {
      statusCode = errObj.status;
    }
  }

  // 1. Check if rawText contains technical database or infrastructure leaks
  const hasTechnicalLeak = TECHNICAL_LEAK_PATTERNS.some((pat) => pat.test(rawText));
  if (hasTechnicalLeak) {
    if (/\b(?:unique constraint|p2002|duplicate entry)\b/i.test(rawText)) {
      return {
        message: "This entry already exists or is currently in use. Please review your details and try again.",
        actionText: "Review Details",
        actionType: "RETRY",
      };
    }
    return {
      message: "Something went wrong while processing your request. Please try again shortly.",
      actionText: "Try Again",
      actionType: "RETRY",
    };
  }

  // 2. Evaluate error mapping rules
  for (const rule of ERROR_MAPPING_RULES) {
    if (rule.match(errorCode, rawText, statusCode)) {
      return rule.result;
    }
  }

  // 4. If the message is reasonably clean, short, and human-intelligible, allow it
  const isHumanIntelligible =
    rawText.length > 0 &&
    rawText.length <= 150 &&
    !rawText.includes("{") &&
    !rawText.includes("}") &&
    !rawText.includes("SELECT") &&
    !rawText.includes("PrismaClient");

  if (isHumanIntelligible) {
    return {
      message: rawText,
      actionText: "Try Again",
      actionType: "RETRY",
    };
  }

  return {
    message: fallbackMessage,
    actionText: "Try Again",
    actionType: "RETRY",
  };
}

/**
 * Convenience helper returning just the sanitized, friendly string.
 */
export function formatUserError(error: unknown, fallback?: string): string {
  return getUserFriendlyErrorMessage(error, fallback).message;
}

/**
 * Centralized Actionable & Specific Success Messages
 */
export const USER_SUCCESS_MESSAGES = {
  // Wallet & Banking
  WITHDRAWAL_SUBMITTED: "Withdrawal request submitted successfully. Funds will reflect in your bank account within 2-3 business days.",
  WITHDRAWAL_REQUESTED: "Withdrawal request submitted successfully. Funds will reflect in your bank account within 2-3 business days.",
  BANK_ACCOUNT_SAVED: "Bank account saved. Verification penny-drop initiated and will confirm shortly.",
  BANK_ACCOUNT_ADDED: "Bank account saved. Verification penny-drop initiated and will confirm shortly.",
  BANK_ACCOUNT_DELETED: "Bank account removed successfully.",
  FUNDS_ADDED: "Funds added to your wallet successfully.",

  // Authentication & Security
  PASSWORD_CHANGED: "Password updated successfully. For your security, other active sessions have been signed out.",
  PASSWORD_RESET_EMAIL_SENT: "Password reset link sent to your registered email. Please check your inbox within 15 minutes.",
  TWO_FACTOR_ENABLED: "Two-factor authentication is now active on your account.",
  TWO_FACTOR_DISABLED: "Two-factor authentication has been disabled.",
  CONTACT_VERIFIED: "Contact details verified successfully.",

  // Profile & Settings
  PROFILE_SAVED: "Profile details updated successfully.",
  AVATAR_UPLOADED: "Profile photo updated successfully.",
  SOCIAL_CONNECTED: "Social account connected and verified.",
  SOCIAL_DISCONNECTED: "Social account disconnected successfully.",
  TAX_DETAILS_SAVED: "Tax and GST compliance information saved successfully.",

  // Deals & Contracts
  DEAL_ACCEPTED: "Deal accepted! Escrow deposit has been secured.",
  CONTRACT_SIGNED: "Contract signed successfully. The deal is now active.",
  CONTENT_SUBMITTED: "Deliverables submitted successfully! The brand will review your content.",
  CONTENT_APPROVED: "Deliverables approved! You can now proceed to post live content.",
  PAYMENT_RELEASED: "Payment released from escrow to creator wallet.",
  DISPUTE_SUBMITTED: "Dispute opened. Our moderation team will review evidence within 24-48 hours.",

  // Messaging
  MESSAGE_SENT: "Message sent.",
  OFFER_CREATED: "Formal deal offer sent to creator.",
  OFFER_SENT: "Offer sent successfully.",
  OFFER_ACCEPTED: "Deal offer accepted.",
  USER_BLOCKED: "User blocked. You will no longer receive messages from this account.",
  USER_UNBLOCKED: "User unblocked.",
  REPORT_SUBMITTED: "Report submitted. Our trust & safety team will investigate within 24 hours.",

  // Support
  SUPPORT_TICKET_CREATED: "Support request received. A support specialist will respond within 24 hours.",
} as const;
