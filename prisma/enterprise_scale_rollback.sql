-- ==============================================================================
-- Rollback Script: 20260913120000_enterprise_scale_indexes_and_ledger_protection
-- Target: PostgreSQL / Supabase
-- Purpose: Safely and cleanly revert the enterprise migration
-- ==============================================================================

-- 1. DROP TRIGGERS AND FUNCTIONS
DROP TRIGGER IF EXISTS trg_protect_transaction_ledger ON "Transaction";
DROP FUNCTION IF EXISTS trg_fn_protect_transaction_ledger();

DROP TRIGGER IF EXISTS trg_immutable_audit_log ON "AuditLog";
DROP FUNCTION IF EXISTS trg_fn_protect_audit_log();

-- 2. DROP CHECK CONSTRAINTS
ALTER TABLE "Wallet" DROP CONSTRAINT IF EXISTS check_wallet_balance_nonnegative;
ALTER TABLE "Wallet" DROP CONSTRAINT IF EXISTS check_wallet_pending_nonnegative;
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS check_transaction_amount_positive;
ALTER TABLE "PaymentHold" DROP CONSTRAINT IF EXISTS check_payment_hold_amount_positive;
ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS check_withdrawal_amount_positive;
ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS check_deal_amounts_nonnegative;

-- 3. DROP COMPOSITE AND FOREIGN KEY INDEXES
DROP INDEX IF EXISTS "Campaign_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Campaign_brandId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Campaign_targetCategories_gin_idx";
DROP INDEX IF EXISTS "Campaign_targetCities_gin_idx";

DROP INDEX IF EXISTS "Application_campaignId_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Application_influencerId_status_deletedAt_createdAt_idx";

DROP INDEX IF EXISTS "Deal_brandId_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Deal_influencerId_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Deal_brandId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Deal_influencerId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Deal_campaignId_status_deletedAt_createdAt_idx";

DROP INDEX IF EXISTS "Notification_userId_isRead_createdAt_idx";
DROP INDEX IF EXISTS "Message_dealId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Dispute_resolvedByUserId_idx";
DROP INDEX IF EXISTS "IdempotencyKey_userId_idx";
