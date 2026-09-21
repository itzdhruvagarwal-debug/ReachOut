/**
 * Wallet, Transaction & Banking Constants
 */

// Minimum & Maximum Wallet Top-up
export const MIN_WALLET_TOPUP_RUPEES = 100;
export const MIN_WALLET_TOPUP_PAISE = 10_000; // ₹100 (10,000 paise)
export const MAX_WALLET_TOPUP_RUPEES = 1_000_000; // ₹10,00,000 (10 Lakh)
export const MAX_WALLET_TOPUP_PAISE = 100_000_000; // ₹10,00,000 (100 million paise)

// Withdrawal Limits
export const MIN_WITHDRAWAL_AMOUNT_RUPEES = 500;
export const MIN_WITHDRAWAL_AMOUNT_PAISE = 50_000; // ₹500 (50,000 paise)
export const MAX_WITHDRAWAL_AMOUNT_RUPEES = 500_000; // ₹5,00,000 (5 Lakh)
export const MAX_WITHDRAWAL_AMOUNT_PAISE = 50_000_000; // ₹5,00,000 per request

// Banking & Security Thresholds
export const MAX_LINKED_BANK_ACCOUNTS = 5;
export const NEW_ACCOUNT_LARGE_WITHDRAWAL_THRESHOLD_PAISE = 2_500_000; // ₹25,000
export const NEW_ACCOUNT_AGE_DAYS_THRESHOLD = 30; // 30 days
export const RAPID_FIRE_WITHDRAWAL_WINDOW_SECONDS = 600; // 10 minutes
export const RAPID_FIRE_WITHDRAWAL_MAX_COUNT = 2;

// Pagination & Ledger Limits
export const DEFAULT_TRANSACTION_PAGE_LIMIT = 20;
export const MAX_TRANSACTION_QUERY_LIMIT = 100;
export const MAX_TRANSACTION_EXPORT_LIMIT = 10_000;
export const STATEMENT_EXPORT_DEFAULT_DAYS = 30;
export const STATEMENT_EXPORT_MAX_DAYS = 90;
