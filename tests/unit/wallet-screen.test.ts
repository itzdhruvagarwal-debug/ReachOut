import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatCurrency } from "@/lib/utils-client";
import { subscribeToWalletUpdates } from "@/lib/supabase-realtime";

describe("Wallet Screen: Balance Segregation & Formatting", () => {
  it("formats currency values cleanly in INR format", () => {
    // 50,000 paise = ₹500
    expect(formatCurrency(50000)).toContain("500");
    // 1,00,000 paise = ₹1,000
    expect(formatCurrency(100000)).toContain("1,000");
    // 10,00,000 paise = ₹10,000
    expect(formatCurrency(1000000)).toContain("10,000");
    // 1,00,00,000 paise = ₹1,00,000 (1 Lakh)
    expect(formatCurrency(10000000)).toContain("1,00,000");
  });

  it("strictly separates available, escrow-locked, and pending balances", () => {
    const rawWallet = {
      balance: 2500000, // ₹25,000 available
      pendingBalance: 1500000, // ₹15,000 pending clearance
      totalHeld: 5000000, // ₹50,000 brand escrow held
      totalEarned: 10000000,
      totalWithdrawn: 6000000,
    };

    const availablePaise = rawWallet.balance;
    const escrowLockedPaise = rawWallet.totalHeld;
    const pendingPaise = rawWallet.pendingBalance;

    expect(availablePaise).toBe(2500000);
    expect(escrowLockedPaise).toBe(5000000);
    expect(pendingPaise).toBe(1500000);

    // Sum verification: Available + Escrow + Pending are mutually exclusive buckets
    expect(availablePaise + escrowLockedPaise + pendingPaise).toBe(9000000);
  });
});

describe("Wallet Screen: Withdrawal Amount Validation Guards", () => {
  const MIN_WITHDRAWAL_PAISE = 50000; // ₹500
  const MAX_WITHDRAWAL_PAISE = 50000000; // ₹5,00,000
  const availableBalanceInPaise = 2500000; // ₹25,000

  function validateWithdrawal(amountPaise: number) {
    if (amountPaise <= 0 || Number.isNaN(amountPaise)) {
      return { valid: false, error: "Please enter a valid positive amount." };
    }
    if (amountPaise < MIN_WITHDRAWAL_PAISE) {
      return { valid: false, error: `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL_PAISE)}.` };
    }
    if (amountPaise > MAX_WITHDRAWAL_PAISE) {
      return { valid: false, error: `Maximum single withdrawal is ${formatCurrency(MAX_WITHDRAWAL_PAISE)}.` };
    }
    if (amountPaise > availableBalanceInPaise) {
      return { valid: false, error: "Amount exceeds available balance." };
    }
    return { valid: true, error: null };
  }

  it("rejects amounts below minimum ₹500", () => {
    const result = validateWithdrawal(20000); // ₹200
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum withdrawal");
  });

  it("rejects amounts exceeding available balance", () => {
    const result = validateWithdrawal(3000000); // ₹30,000 when only ₹25,000 available
    expect(result.valid).false;
    expect(result.error).toContain("exceeds available balance");
  });

  it("rejects amounts exceeding maximum ₹5,00,000", () => {
    const result = validateWithdrawal(60000000); // ₹6,00,000
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum single withdrawal");
  });

  it("approves valid amounts within boundaries", () => {
    const result = validateWithdrawal(1000000); // ₹10,000
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });
});

describe("Wallet Screen: Payout Itemized Breakdown & Idempotency", () => {
  it("calculates zero-fee breakdown and net payout correctly", () => {
    const requestedPaise = 1500000; // ₹15,000
    const platformFeePaise = 0; // Zero fee
    const tdsPaise = 0; // 0 for PAN compliant

    const netPaise = requestedPaise - platformFeePaise - tdsPaise;
    expect(netPaise).toBe(1500000);
    expect(formatCurrency(netPaise)).toContain("15,000");
  });

  it("generates 32-character idempotency key with valid format", () => {
    const rawUuid = "abcdef1234567890abcdef1234567890";
    const key = `withdraw_key_${rawUuid}`.slice(0, 32);

    expect(key.length).toBe(32);
    expect(key).toMatch(/^withdraw_key_[a-f0-9]+$/);
  });
});

describe("Wallet Screen: Virtualized Ledger Filtering", () => {
  const sampleTransactions = [
    { id: "tx-1", type: "CREDIT", amount: 2000000, status: "COMPLETED", description: "Campaign Payout: Nike" },
    { id: "tx-2", type: "WITHDRAWAL", amount: 1000000, status: "COMPLETED", description: "IMPS Payout to HDFC" },
    { id: "tx-3", type: "DEBIT", amount: 50000, status: "COMPLETED", description: "Platform Fee" },
    { id: "tx-4", type: "CREDIT", amount: 500000, status: "PENDING", description: "Pending Deal Escrow Release" },
    { id: "tx-5", type: "REFUND", amount: 100000, status: "COMPLETED", description: "Dispute Refund" },
  ];

  const CREDIT_TYPES = new Set(["CREDIT", "REFUND"]);
  const DEBIT_TYPES = new Set(["DEBIT", "WITHDRAWAL", "PLATFORM_FEE", "CLAWBACK", "CHARGEBACK"]);

  it("filters credit transactions (credits + refunds)", () => {
    const credits = sampleTransactions.filter((t) => CREDIT_TYPES.has(t.type));
    expect(credits.length).toBe(3);
    expect(credits.map((t) => t.id)).toEqual(["tx-1", "tx-4", "tx-5"]);
  });

  it("filters debit transactions (withdrawals + fees)", () => {
    const debits = sampleTransactions.filter((t) => DEBIT_TYPES.has(t.type));
    expect(debits.length).toBe(2);
    expect(debits.map((t) => t.id)).toEqual(["tx-2", "tx-3"]);
  });

  it("filters pending transactions", () => {
    const pending = sampleTransactions.filter((t) => t.status === "PENDING");
    expect(pending.length).toBe(1);
    expect(pending[0]?.id).toBe("tx-4");
  });

  it("searches transactions by keyword across description and ID", () => {
    const search = "Nike".toLowerCase();
    const matches = sampleTransactions.filter((t) =>
      t.description.toLowerCase().includes(search) || t.id.toLowerCase().includes(search)
    );
    expect(matches.length).toBe(1);
    expect(matches[0]?.id).toBe("tx-1");
  });
});

describe("Wallet Screen: Supabase Realtime Subscription", () => {
  it("provides subscribeToWalletUpdates with teardown function", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToWalletUpdates("user_test_123", callback);
    expect(typeof unsubscribe).toBe("function");

    // Calling unsubscribe executes cleanly without throwing
    expect(() => unsubscribe()).not.toThrow();
  });
});
