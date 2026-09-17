"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import useSWR from "swr";
import { fetcher, createSchemaFetcher } from "@/lib/fetcher";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  walletResponseSchema,
  walletTransactionsResponseSchema,
  type WalletResponse,
  type WalletTransactionsResponse,
  type WalletSummary,
} from "@/lib/schemas";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BankAccountManager from "@/components/dashboard/wallet/BankAccountManager";
import { VirtualizedTransactionList, type TransactionItem } from "@/components/dashboard/wallet/VirtualizedTransactionList";
import { FullScreenWithdrawFlow } from "@/components/dashboard/wallet/FullScreenWithdrawFlow";
import { StatementExportModal } from "@/components/dashboard/wallet/StatementExportModal";
import { subscribeToWalletUpdates } from "@/lib/supabase-realtime";
import { useTokenRefreshGuard } from "@/hooks/useTokenRefreshGuard";
import { useWallet } from "@/hooks/api/useWallet";
import { formatCurrency } from "@/lib/utils-client";
import { ToastContainer, type ToastItem, type ToastType } from "@/components/ui/toast";
import { Button, Input, Modal, Card } from "@/components/ui";
import {
  ShieldCheck,
  Lock,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Building2,
  RefreshCw,
  Plus,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

const walletTransactionsFetcher = createSchemaFetcher(walletTransactionsResponseSchema);

export type WalletData = WalletSummary;

const loadRazorpay = () => {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-sdk") as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function WalletPage() {
  const { data: session } = useSession();
  const { requireFreshSession } = useTokenRefreshGuard();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"ledger" | "accounts">("ledger");

  // Modals & Flows
  const [showWithdrawFlow, setShowWithdrawFlow] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const handleRemoveToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = String(Date.now());
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => handleRemoveToast(id), 5000);
    },
    [handleRemoveToast],
  );



  // Centralized useWallet Hook (authoritative single source of truth)
  const {
    walletData,
    userType: hookUserType,
    isLoading: isWalletLoading,
    refresh: fetchWalletData,
  } = useWallet();

  // SWR: Single Source of Truth for Transactions
  const {
    data: txResponse,
    isLoading: isTxLoading,
    mutate: mutateTransactions,
  } = useSWR<WalletTransactionsResponse>(
    session?.user?.id ? "/api/wallet/transactions?limit=100" : null,
    walletTransactionsFetcher,
    {
      revalidateOnFocus: true,
    },
  );

  const userType = hookUserType || session?.user?.userType || null;
  const isBrand = userType === "BRAND";
  const transactions = txResponse?.transactions || [];

  // ==================== SUPABASE REALTIME SUBSCRIPTION ====================
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = subscribeToWalletUpdates(session.user.id, (_payload) => {
      // Immediate dual invalidation: updates balance and transaction ledger simultaneously
      fetchWalletData();
      mutateTransactions();
      setIsRealtimeActive(true);
      showToast("info", "Wallet balance updated in real time");
    });

    setIsRealtimeActive(true);

    return () => {
      unsubscribe();
    };
  }, [session?.user?.id, fetchWalletData, mutateTransactions, showToast]);

  // Combined refresh action
  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchWalletData(), mutateTransactions()]);
    showToast("success", "Wallet data refreshed.");
  }, [fetchWalletData, mutateTransactions, showToast]);

  // ==================== BRAND ADD FUNDS (RAZORPAY) ====================
  const handleAddFunds = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fresh = await requireFreshSession();
    if (!fresh) return;

    const form = e.currentTarget;
    const amountInput = form.elements.namedItem("amount") as HTMLInputElement;
    const amountRupees = parseFloat(amountInput.value);

    if (!amountRupees || amountRupees < 100) {
      showToast("error", "Minimum top-up amount is ₹100");
      return;
    }

    setIsAddingFunds(true);
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error("Unable to connect to payment gateway. Please check your connection.");
      }

      const orderData = (await apiClient.wallet.addFunds(Math.round(amountRupees * 100))) as {
        data?: { amount: number; orderId: string };
      };

      if (!orderData?.data?.orderId) {
        throw new Error("Failed to initialize payment order");
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderData.data.amount,
        currency: "INR",
        name: "VyaparMedia Marketplace",
        description: "Wallet Balance Top-Up",
        order_id: orderData.data.orderId,

        handler: async (paymentResponse: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => {
          try {
            const verifyData = await apiClient.wallet.verifyPayment({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            }) as { success?: boolean };
            if (verifyData.success) {
              showToast("success", `Successfully added ${formatCurrency(Math.round(amountRupees * 100))} to wallet.`);
              handleRefreshAll();
              setShowAddFundsModal(false);
            } else {
              showToast("error", "Payment verification pending. Balance will update shortly.");
            }
          } catch (err) {
            showToast("error", err instanceof ApiClientError ? err.message : "Error verifying payment signature");
          }
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: { color: "#2563eb" },
      });

      rzp.open();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setIsAddingFunds(false);
    }
  };

  return (
    <DashboardShell>
      <ToastContainer toasts={toasts} onClose={handleRemoveToast} />

      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* ==================== SCREEN HEADER & QUICK ACTIONS ==================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Wallet &amp; Financial Ledger
              </h1>
              {isRealtimeActive && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  title="Live Supabase connection actively syncs balance changes"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-secondary">
              {isBrand
                ? "Manage escrow funds, campaign deposits, and payout receipts."
                : "Real-time earnings, escrow holdings, and bank withdrawal portal."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isBrand ? (
              <Button
                variant="primary"
                onClick={() => setShowAddFundsModal(true)}
                className="font-bold text-xs sm:text-sm gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Funds
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowWithdrawFlow(true)}
                disabled={isWalletLoading || (walletData?.balance || 0) < 50000}
                className="font-bold text-xs sm:text-sm gap-1.5 shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4" /> Withdraw Funds
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => setShowStatementModal(true)}
              className="font-semibold text-xs sm:text-sm gap-1.5"
            >
              <Download className="w-4 h-4" /> Download Statement
            </Button>
          </div>
        </div>

        {/* ==================== FINANCIAL BALANCE OVERVIEW ==================== */}
        {/* Requirement 1 & 4: Clarity first, tabular-nums, never flash ₹0.00 */}
        {isWalletLoading ? (
          /* Financial Shimmer Skeletons (Prevents ₹0 Flash) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
            <div className="lg:col-span-2 h-44 rounded-2xl bg-secondary/40 border border-border p-6 space-y-4">
              <div className="w-32 h-4 bg-secondary rounded" />
              <div className="w-64 h-12 bg-secondary rounded" />
              <div className="w-48 h-3 bg-secondary rounded" />
            </div>
            <div className="h-44 rounded-2xl bg-secondary/40 border border-border p-6 space-y-4">
              <div className="w-28 h-4 bg-secondary rounded" />
              <div className="w-40 h-8 bg-secondary rounded" />
              <div className="w-32 h-3 bg-secondary rounded" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* HERO CARD: Available Balance (Sabse Bada & Sabse Prominent) */}
            <div className="lg:col-span-2 relative rounded-2xl p-6 sm:p-8 bg-card border-2 border-primary/40 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    {isBrand ? "Available Balance (Top-Up Funds)" : "Available for Payout (Immediately Withdrawable)"}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    Escrow Ready
                  </span>
                </div>

                {/* BIGGEST ELEMENT ON SCREEN: TABULAR-NUMS CURRENCY */}
                <div className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                  {formatCurrency(walletData?.balance || 0)}
                </div>

                <p className="text-xs text-secondary leading-relaxed max-w-lg">
                  {isBrand
                    ? "Available to instantly secure campaign milestone escrows for verified creators."
                    : "Zero lock-in. Funds can be transferred to your verified bank account via IMPS at any time."}
                </p>
              </div>

              {/* Bottom Quick-Action Bar inside Hero Card */}
              <div className="pt-6 mt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-secondary">
                  {isBrand ? (
                    <span>Total Deposited: <strong className="text-foreground font-mono">{formatCurrency(walletData?.totalDeposited || 0)}</strong></span>
                  ) : (
                    <span>Lifetime Earned: <strong className="text-foreground font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(walletData?.totalEarned || 0)}</strong></span>
                  )}
                </div>

                {isBrand ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowAddFundsModal(true)}
                    className="font-bold text-xs"
                  >
                    + Add Funds
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowWithdrawFlow(true)}
                    disabled={(walletData?.balance || 0) < 50000}
                    className="font-bold text-xs"
                  >
                    Withdraw to Bank ↗
                  </Button>
                )}
              </div>
            </div>

            {/* SIDE METRICS: Escrow-Locked & Pending Balances */}
            <div className="flex flex-col gap-4">
              {/* ESCROW-LOCKED CARD */}
              <div className="rounded-2xl p-5 bg-card border border-blue-500/30 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs mb-2 text-blue-600 dark:text-blue-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Escrow-Locked Funds
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                    Safe Lock
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-foreground tracking-tight">
                  {formatCurrency(isBrand ? (walletData?.totalHeld || 0) : (walletData?.pendingBalance || 0))}
                </div>

                <p className="text-[11px] text-secondary mt-1.5 leading-normal">
                  {isBrand
                    ? "Funds held in active campaign escrows, releasing automatically upon deliverable approval."
                    : "Earnings currently held in client escrow milestones, auto-releasing upon brand approval."}
                </p>
              </div>

              {/* PENDING CLEARANCE CARD */}
              <div className="rounded-2xl p-5 bg-card border border-amber-500/30 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs mb-2 text-amber-600 dark:text-amber-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {isBrand ? "Total Campaign Spend" : "Total Withdrawn to Bank"}
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-foreground tracking-tight">
                  {formatCurrency(isBrand ? (walletData?.totalSpent || 0) : (walletData?.totalWithdrawn || 0))}
                </div>

                <p className="text-[11px] text-secondary mt-1.5 leading-normal">
                  {isBrand
                    ? "Cumulative payouts completed to content creators across all verified campaigns."
                    : "Total lifetime earnings safely deposited into your registered bank accounts."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== NAVIGATION TABS: LEDGER VS BANK ACCOUNTS ==================== */}
        <div className="flex items-center gap-3 border-b border-border text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "ledger"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-secondary hover:text-foreground"
            }`}
          >
            Transaction Ledger ({transactions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "accounts"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-secondary hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Saved Bank Accounts &amp; KYC</span>
          </button>
        </div>

        {/* ==================== TAB 1: VIRTUALIZED TRANSACTION LEDGER ==================== */}
        {activeTab === "ledger" && (
          <VirtualizedTransactionList
            transactions={transactions}
            isLoading={isTxLoading}
            onRefresh={handleRefreshAll}
          />
        )}

        {/* ==================== TAB 2: BANK ACCOUNTS MANAGER ==================== */}
        {activeTab === "accounts" && (
          <div className="max-w-2xl">
            <BankAccountManager />
          </div>
        )}
      </div>

      {/* ==================== DEDICATED FULL-SCREEN WITHDRAW FLOW ==================== */}
      <FullScreenWithdrawFlow
        isOpen={showWithdrawFlow}
        onClose={() => setShowWithdrawFlow(false)}
        availableBalanceInPaise={walletData?.balance || 0}
        onSuccess={handleRefreshAll}
        userEmail={session?.user?.email}
        userName={session?.user?.name}
      />

      {/* ==================== STATEMENT EXPORT MODAL ==================== */}
      <StatementExportModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        userType={userType}
        userName={session?.user?.name}
      />

      {/* ==================== BRAND ADD FUNDS MODAL (RAZORPAY) ==================== */}
      <Modal
        open={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        title="Add Funds to Escrow Wallet"
        maxWidth="480px"
      >
        <form onSubmit={handleAddFunds} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block" htmlFor="add-funds-amount-input">
              Top-Up Amount (INR)
            </label>
            <Input
              id="add-funds-amount-input"
              name="amount"
              type="number"
              min="100"
              required
              placeholder="e.g. 25000"
              fullWidth
              autoFocus
            />
            <p className="text-[11px] text-secondary mt-1">
              Minimum top-up is ₹100. Funds are instantly credited and available for escrow locking.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border text-xs text-secondary space-y-1">
            <span className="font-semibold text-foreground">Supported Payment Methods:</span>
            <p className="text-[11px]">UPI (GPay, PhonePe, Paytm), NetBanking (50+ banks), Corporate Cards, &amp; NEFT.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isAddingFunds}
              onClick={() => setShowAddFundsModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAddingFunds}
              className="font-bold"
            >
              {isAddingFunds ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Gateway...</span>
                </>
              ) : (
                "Proceed to Pay"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
