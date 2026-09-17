"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Lock,
  RefreshCw,
  Clock,
  ExternalLink,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils-client";

export interface SavedBankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string | null;
  isDefault?: boolean;
  isVerified?: boolean;
}

interface FullScreenWithdrawFlowProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalanceInPaise: number;
  onSuccess?: (() => void) | (() => Promise<void>) | undefined;
  userEmail?: string | null | undefined;
  userName?: string | null | undefined;
}

type WithdrawStep = "amount" | "destination" | "confirm" | "success";

const MIN_WITHDRAWAL_PAISE = 50000; // ₹500 minimum
const MAX_WITHDRAWAL_PAISE = 50000000; // ₹5,00,000 maximum

export function FullScreenWithdrawFlow({
  isOpen,
  onClose,
  availableBalanceInPaise,
  onSuccess,
  userEmail,
  userName,
}: FullScreenWithdrawFlowProps) {
  const [step, setStep] = useState<WithdrawStep>("amount");
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [accounts, setAccounts] = useState<SavedBankAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Confirmation state
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedTxnId, setCompletedTxnId] = useState<string | null>(null);

  // Fetch verified bank accounts on open
  useEffect(() => {
    if (!isOpen) return;

    setStep("amount");
    setAmountRupees("");
    setUserConfirmed(false);
    setSubmitError(null);
    setCompletedTxnId(null);

    const fetchBankAccounts = async () => {
      setIsLoadingAccounts(true);
      setAccountsError(null);

      try {
        const data = await apiClient.wallet.listBankAccounts() as { success?: boolean; data?: SavedBankAccount[] };
        if (data.success && Array.isArray(data.data)) {
          setAccounts(data.data);
          const defaultAcc = data.data.find((a: SavedBankAccount) => a.isDefault && a.isVerified) ||
                             data.data.find((a: SavedBankAccount) => a.isVerified) ||
                             data.data[0];
          if (defaultAcc) {
            setSelectedAccountId(defaultAcc.id);
          }
        }
      } catch (err: unknown) {
        setAccountsError(err instanceof ApiClientError ? err.message : "Failed to load saved bank accounts");
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchBankAccounts();
  }, [isOpen]);

  // Amount parsing and validation
  const parsedAmountRupees = parseFloat(amountRupees) || 0;
  const parsedAmountPaise = Math.round(parsedAmountRupees * 100);

  const amountValidation = useMemo(() => {
    if (!amountRupees) {
      return { valid: false, error: null };
    }
    if (Number.isNaN(parsedAmountRupees) || parsedAmountRupees <= 0) {
      return { valid: false, error: "Please enter a valid positive amount." };
    }
    if (parsedAmountPaise < MIN_WITHDRAWAL_PAISE) {
      return {
        valid: false,
        error: `Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_PAISE)}.`,
      };
    }
    if (parsedAmountPaise > MAX_WITHDRAWAL_PAISE) {
      return {
        valid: false,
        error: `Maximum single withdrawal is ${formatCurrency(MAX_WITHDRAWAL_PAISE)}.`,
      };
    }
    if (parsedAmountPaise > availableBalanceInPaise) {
      return {
        valid: false,
        error: `Amount exceeds your available balance (${formatCurrency(availableBalanceInPaise)}).`,
      };
    }
    return { valid: true, error: null };
  }, [amountRupees, parsedAmountRupees, parsedAmountPaise, availableBalanceInPaise]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Quick select amounts
  const setQuickAmount = (paise: number) => {
    const capped = Math.min(paise, availableBalanceInPaise);
    setAmountRupees((capped / 100).toString());
  };

  // Final submit handler with Idempotency-Key
  const handleExecuteWithdrawal = async () => {
    if (!amountValidation.valid || !selectedAccount || !userConfirmed) return;
    setIsSubmitting(true);
    setSubmitError(null);

    // Generate strict 32-char UUID idempotency key to prevent double withdrawal
    const rawUuid = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replaceAll("-", "")
      : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
    const idempotencyKey = `withdraw_key_${rawUuid}`.slice(0, 32);

    try {
      const data = await apiClient.wallet.withdraw(
        { amount: parsedAmountPaise, bankAccountId: selectedAccount.id },
        { headers: { "Idempotency-Key": idempotencyKey } } as RequestInit,
      ) as { data?: { id?: string; withdrawalId?: string } };

      setCompletedTxnId(data.data?.id || data.data?.withdrawalId || idempotencyKey);
      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setSubmitError(err instanceof ApiClientError ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Deliberate Withdrawal Flow"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-card border-0 sm:border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground">
        
        {/* ==================== HEADER ==================== */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {step !== "amount" && step !== "success" && (
              <button
                type="button"
                onClick={() => setStep(step === "confirm" ? "destination" : "amount")}
                className="p-1.5 -ml-1 text-secondary hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                aria-label="Previous step"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {step === "success" ? "Withdrawal Initiated" : "Withdraw to Bank"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Available Balance:</span>
                <strong className="text-foreground font-mono tabular-nums">
                  {formatCurrency(availableBalanceInPaise)}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close withdrawal flow"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ==================== STEP PROGRESS TABS ==================== */}
        {step !== "success" && (
          <div className="flex items-center border-b border-border bg-secondary/30 px-4 sm:px-6 py-2.5 text-xs">
            <div className="flex items-center justify-between w-full max-w-sm mx-auto">
              <span className={`flex items-center gap-1.5 font-semibold ${
                step === "amount" ? "text-primary" : "text-secondary"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === "amount" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"
                }`}>
                  1
                </span>
                Amount
              </span>

              <div className={`h-0.5 flex-1 mx-3 ${step !== "amount" ? "bg-primary" : "bg-border"}`} />

              <span className={`flex items-center gap-1.5 font-semibold ${
                step === "destination" ? "text-primary" : "text-secondary"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === "destination" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"
                }`}>
                  2
                </span>
                Account
              </span>

              <div className={`h-0.5 flex-1 mx-3 ${step === "confirm" ? "bg-primary" : "bg-border"}`} />

              <span className={`flex items-center gap-1.5 font-semibold ${
                step === "confirm" ? "text-primary" : "text-secondary"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === "confirm" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"
                }`}>
                  3
                </span>
                Confirm
              </span>
            </div>
          </div>
        )}

        {/* ==================== BODY ==================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ==================== STEP 1: AMOUNT SELECTION ==================== */}
          {step === "amount" && (
            <div className="space-y-6 max-w-md mx-auto py-2">
              <div className="text-center">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2" htmlFor="withdraw-amount-input">
                  Enter Withdrawal Amount
                </label>
                <div className="relative inline-block w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-secondary">
                    ₹
                  </span>
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min="500"
                    max="500000"
                    step="1"
                    placeholder="0"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full text-center text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight py-3 px-10 bg-secondary/30 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    autoFocus
                  />
                </div>

                {amountValidation.error && (
                  <p className="text-xs text-rose-500 font-semibold mt-2 animate-in fade-in">
                    {amountValidation.error}
                  </p>
                )}
              </div>

              {/* Quick Select Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-2 text-center">
                  Quick Select
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[1000, 2500, 5000, 10000].map((amt) => {
                    const amtPaise = amt * 100;
                    const isAvailable = amtPaise <= availableBalanceInPaise;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickAmount(amtPaise)}
                        disabled={!isAvailable}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                          isAvailable
                            ? "border-border bg-secondary/40 hover:bg-secondary text-foreground"
                            : "border-border/40 opacity-40 cursor-not-allowed text-secondary"
                        }`}
                      >
                        ₹{amt.toLocaleString("en-IN")}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setQuickAmount(availableBalanceInPaise)}
                    disabled={availableBalanceInPaise < MIN_WITHDRAWAL_PAISE}
                    className="px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold font-mono transition-all"
                  >
                    All Available
                  </button>
                </div>
              </div>

              {/* Guardrails Info */}
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-border text-xs space-y-1 text-secondary">
                <div className="flex justify-between">
                  <span>Minimum withdrawal:</span>
                  <span className="font-mono text-foreground">{formatCurrency(MIN_WITHDRAWAL_PAISE)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum per payout:</span>
                  <span className="font-mono text-foreground">{formatCurrency(MAX_WITHDRAWAL_PAISE)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform payout fee:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0.00 (Zero Fee)</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: DESTINATION ACCOUNT ==================== */}
          {step === "destination" && (
            <div className="space-y-5 max-w-md mx-auto py-2">
              <div>
                <h3 className="font-bold text-base text-foreground">Select Destination Account</h3>
                <p className="text-xs text-secondary">
                  Payouts can only be routed to KYC-verified bank accounts in your name.
                </p>
              </div>

              {isLoadingAccounts ? (
                <div className="p-6 text-center text-xs text-secondary space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary" />
                  <p>Loading verified bank accounts...</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center space-y-3">
                  <Building2 className="w-8 h-8 text-secondary mx-auto" />
                  <div className="text-xs">
                    <strong className="block text-foreground mb-1">No Verified Bank Accounts</strong>
                    <p className="text-secondary">
                      You must add and verify a bank account via penny-drop before withdrawing.
                    </p>
                  </div>
                  <a
                    href="/dashboard/wallet?tab=bank-accounts"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Bank Account
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const isVerified = acc.isVerified;

                    return (
                      <label
                        key={acc.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          !isVerified
                            ? "opacity-50 cursor-not-allowed border-border bg-secondary/10"
                            : isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-secondary/30 hover:border-border/80"
                        }`}
                      >
                        <input
                          type="radio"
                          name="destination-account"
                          value={acc.id}
                          checked={isSelected}
                          disabled={!isVerified}
                          onChange={() => setSelectedAccountId(acc.id)}
                          className="mt-1 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">
                              {acc.bankName || "Bank Account"}
                            </span>
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">
                                Verification Pending
                              </span>
                            )}
                          </div>

                          <div className="mt-1 font-mono text-xs text-foreground">
                            {acc.accountNumber}
                          </div>
                          <div className="text-[11px] text-secondary flex items-center gap-2 mt-0.5">
                            <span>Beneficiary: {acc.accountName || userName}</span>
                            <span>•</span>
                            <span>IFSC: {acc.ifscCode}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Security Banner */}
              <div className="p-3 rounded-xl bg-secondary/30 border border-border text-xs text-secondary flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  All payouts are processed via RazorpayX directly to your bank account using IMPS. Account details are encrypted with AES-256.
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: EXPLICIT CONFIRMATION ==================== */}
          {step === "confirm" && selectedAccount && (
            <div className="space-y-5 max-w-md mx-auto py-2">
              <div className="text-center">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1">
                  Total Payout to Bank
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(parsedAmountPaise)}
                </div>
              </div>

              {/* Itemized Breakdown Table */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2.5 text-xs">
                <h4 className="font-bold text-xs uppercase tracking-wider text-secondary mb-2">
                  Payout Breakdown
                </h4>

                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-secondary">Gross Withdrawal:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {formatCurrency(parsedAmountPaise)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-secondary">Platform Transfer Fee:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹0.00 (Zero Fee)
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-secondary">TDS Section 194S / Tax:</span>
                  <span className="font-mono text-secondary">₹0.00 (PAN Verified)</span>
                </div>

                <div className="flex justify-between py-1 font-bold text-sm text-foreground pt-1">
                  <span>Net Credited to Bank:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(parsedAmountPaise)}
                  </span>
                </div>
              </div>

              {/* Receiving Destination Summary */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-1.5 text-xs">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                  Receiving Bank Account
                </span>
                <div className="font-bold text-foreground text-sm flex items-center justify-between">
                  <span>{selectedAccount.bankName}</span>
                  <span className="font-mono text-xs">{selectedAccount.accountNumber}</span>
                </div>
                <div className="text-secondary text-[11px]">
                  Beneficiary: {selectedAccount.accountName || userName} • IFSC: {selectedAccount.ifscCode}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Transfer Mode: Instant IMPS (typically 2–4 hours)</span>
                </div>
              </div>

              {/* Mandatory Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/30 bg-primary/5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={userConfirmed}
                  onChange={(e) => setUserConfirmed(e.target.checked)}
                  className="mt-0.5 accent-primary h-4 w-4 rounded"
                />
                <span className="text-foreground leading-relaxed">
                  I confirm that the bank details above belong to me and authorize the immediate deduction of{" "}
                  <strong>{formatCurrency(parsedAmountPaise)}</strong> from my available wallet balance.
                </span>
              </label>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}

          {/* ==================== STEP 4: SUCCESS SCREEN ==================== */}
          {step === "success" && (
            <div className="py-8 px-4 text-center max-w-md mx-auto space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Payout Request Initiated!
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Your withdrawal of{" "}
                  <strong className="text-foreground font-mono">
                    {formatCurrency(parsedAmountPaise)}
                  </strong>{" "}
                  has been submitted for processing.
                </p>
                {completedTxnId && (
                  <p className="text-[11px] font-mono text-secondary mt-1">
                    Ref ID: {completedTxnId}
                  </p>
                )}
              </div>

              {/* SLA Timeline */}
              <div className="text-left bg-secondary/30 border border-border rounded-xl p-4 space-y-3.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-secondary text-[11px]">
                  Payout Progress
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div>
                      <strong className="block text-foreground">Wallet Debited</strong>
                      <span className="text-secondary text-[11px]">
                        Funds held in payout queue via RazorpayX.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="block text-foreground">IMPS Bank Dispatch</strong>
                      <span className="text-secondary text-[11px]">
                        Bank server confirms transfer. Usually resolves within 2–4 hours.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-secondary text-secondary font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="block text-secondary">Account Credit</strong>
                      <span className="text-secondary text-[11px]">
                        Deposit reflects in {selectedAccount?.bankName || "your bank account"}.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={onClose}
                fullWidth
                className="font-bold py-2.5"
              >
                Back to Wallet
              </Button>
            </div>
          )}
        </div>

        {/* ==================== FOOTER ACTIONS ==================== */}
        {step !== "success" && (
          <footer className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-border bg-card/80 backdrop-blur-md sticky bottom-0 z-20">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {step === "amount" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!amountValidation.valid}
                onClick={() => setStep("destination")}
                className="gap-1 font-bold"
              >
                <span>Select Bank</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {step === "destination" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!selectedAccount || !selectedAccount.isVerified}
                onClick={() => setStep("confirm")}
                className="gap-1 font-bold"
              >
                <span>Review &amp; Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {step === "confirm" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!userConfirmed || isSubmitting}
                onClick={handleExecuteWithdrawal}
                className="gap-1.5 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize &amp; Withdraw</span>
                  </>
                )}
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
