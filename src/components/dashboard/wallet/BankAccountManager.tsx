"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import EmptyState from "@/components/ui/EmptyState";
import { logger } from "@/lib/logger-client";
import { Button, Input, Skeleton, Card } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formatUserError, USER_SUCCESS_MESSAGES } from "@/lib/user-messages";
import { Plus, CheckCircle2, Trash2, Building2, Smartphone } from "lucide-react";

import {
  bankAccountInputSchema as bankAccountSchema,
  type BankAccountItem as BankAccount,
  type BankAccountsResponse,
} from "@/lib/schemas";
export { bankAccountSchema };

function getDisplayAccountNumber(isUpi: boolean, upiId?: string | null, accountNumber?: string | null): string {
  if (isUpi) {
    return upiId || "";
  }
  if (accountNumber?.startsWith("•")) {
    return accountNumber;
  }
  const digits = accountNumber?.replace(/\D/g, "") || "";
  const last4 = digits.length >= 4 ? digits.slice(-4) : (accountNumber?.slice(-4) || "••••");
  return `••••  ••••  ${last4}`;
}

export default function BankAccountManager({
  onSelectAccount,
}: Readonly<{
  onSelectAccount?: (account: BankAccount) => void;
}>) {
  const [showForm, setShowForm] = useState(false);
  const [payoutType, setPayoutType] = useState<"bank" | "upi">("bank");
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
    isDefault: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading: loading, mutate: fetchAccounts } = useSWR<BankAccountsResponse>(
    "/api/wallet/bank-accounts",
    fetcher,
  );

  const accounts: BankAccount[] = data?.accounts || [];

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const validation = bankAccountSchema.safeParse({
      payoutType,
      accountName: newAccount.accountName.trim(),
      accountNumber: newAccount.accountNumber.trim(),
      ifscCode: newAccount.ifscCode.trim().toUpperCase(),
      bankName: newAccount.bankName.trim(),
      upiId: newAccount.upiId.trim(),
    });

    if (!validation.success) {
      setIsSaving(false);
      showNotice(validation.error.issues[0]?.message || "Invalid bank account details", "error");
      return;
    }

    try {
      const payload =
        payoutType === "upi"
          ? {
              payoutType: "upi" as const,
              accountName: newAccount.accountName.trim(),
              upiId: newAccount.upiId.trim(),
              isDefault: newAccount.isDefault,
            }
          : {
              payoutType: "bank" as const,
              accountName: newAccount.accountName.trim(),
              accountNumber: newAccount.accountNumber.trim(),
              ifscCode: newAccount.ifscCode.trim().toUpperCase(),
              bankName: newAccount.bankName.trim(),
              upiId: newAccount.upiId.trim() || undefined,
              isDefault: newAccount.isDefault,
            };

      const res = (await apiClient.wallet.addBankAccount(payload)) as {
        success?: boolean;
        error?: string;
      };
      if (res && res.success !== false) {
        fetchAccounts();
        setShowForm(false);
        setPayoutType("bank");
        setNewAccount({
          accountName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
          upiId: "",
          isDefault: false,
        });
        showNotice(USER_SUCCESS_MESSAGES.BANK_ACCOUNT_SAVED);
      } else {
        showNotice(res?.error || "Failed to add account", "error");
      }
    } catch (error) {
      logger.error("[bank-account] Failed to add account:", error);
      showNotice(
        formatUserError(error, "Failed to add bank account. Please verify details and try again."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.wallet.setDefaultAccount(id);
      fetchAccounts();
      showNotice("Default bank account updated.");
    } catch (err) {
      showNotice(
        formatUserError(err, "Failed to set default bank account. Please try again."),
        "error",
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await apiClient.wallet.deleteBankAccount(id);
      fetchAccounts();
      showNotice(USER_SUCCESS_MESSAGES.BANK_ACCOUNT_DELETED);
    } catch (error) {
      logger.error("[bank-account] Failed to delete account:", error);
      showNotice(
        formatUserError(error, "Failed to delete bank account. Please try again."),
        "error",
      );
    }
  };

  if (loading) {
    return (
      <Card className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-heading font-bold text-foreground">
            Saved Bank Accounts &amp; Payouts
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage your verified beneficiary accounts for instant IMPS bank transfers.
          </p>
        </div>
        <Button
          variant={showForm ? "secondary" : "primary"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1 text-xs font-bold"
        >
          {showForm ? "Cancel" : <><Plus className="w-3.5 h-3.5" /> Add Account</>}
        </Button>
      </div>

      {/* Inline notice */}
      {notice && (
        <div
          className={`mb-4 text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
            notice.type === "success"
              ? "bg-verified-muted text-verified border-verified-border"
              : "bg-disputed-muted text-disputed border-disputed-border"
          }`}
        >
          {notice.message}
        </div>
      )}

      {/* Inline delete confirmation */}
      {deleteConfirmId && (
        <div className="mb-4 rounded-xl p-4 bg-disputed-muted border border-disputed-border">
          <p className="text-xs font-semibold text-disputed mb-2">
            Are you sure you want to delete this bank account? Payouts can no longer be routed to it.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Yes, Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Account Form */}
      {showForm && (
        <form
          onSubmit={handleAddAccount}
          className="p-4 sm:p-5 mb-5 bg-muted/40 border border-border rounded-2xl space-y-4"
        >
          <div className="flex gap-4 border-b border-border pb-3">
            <label className="flex items-center cursor-pointer text-xs font-semibold text-foreground gap-1.5">
              <input
                type="radio"
                name="payoutType"
                checked={payoutType === "bank"}
                onChange={() => setPayoutType("bank")}
                className="accent-primary"
              />
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Bank Account</span>
            </label>
            <label className="flex items-center cursor-pointer text-xs font-semibold text-foreground gap-1.5">
              <input
                type="radio"
                name="payoutType"
                checked={payoutType === "upi"}
                onChange={() => setPayoutType("upi")}
                className="accent-primary"
              />
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>UPI ID</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="bank-holder-name-input"
              label="Account Holder Name"
              required
              value={newAccount.accountName}
              onChange={(e) =>
                setNewAccount({ ...newAccount, accountName: e.target.value })
              }
              fullWidth
            />
            {payoutType === "bank" ? (
              <>
                <Input
                  id="bank-name-input"
                  label="Bank Name"
                  required
                  value={newAccount.bankName}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, bankName: e.target.value })
                  }
                  fullWidth
                />
                <Input
                  id="bank-account-number-input"
                  label="Account Number"
                  required
                  value={newAccount.accountNumber}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      accountNumber: e.target.value,
                    })
                  }
                  fullWidth
                />
                <Input
                  id="bank-ifsc-code-input"
                  label="IFSC Code"
                  required
                  value={newAccount.ifscCode}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      ifscCode: e.target.value.toUpperCase(),
                    })
                  }
                  fullWidth
                />
                <Input
                  id="bank-upi-id-optional-input"
                  label="UPI ID (Optional)"
                  value={newAccount.upiId}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, upiId: e.target.value })
                  }
                  fullWidth
                />
              </>
            ) : (
              <Input
                id="bank-upi-id-input"
                label="UPI ID"
                required
                placeholder="username@bank"
                value={newAccount.upiId}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, upiId: e.target.value })
                }
                fullWidth
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="bank-is-default"
              checked={newAccount.isDefault}
              onChange={(e) =>
                setNewAccount({ ...newAccount, isDefault: e.target.checked })
              }
              className="accent-primary h-4 w-4 rounded"
            />
            <label htmlFor="bank-is-default" className="text-xs font-semibold cursor-pointer text-foreground">
              Set as primary default payout method
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="font-bold text-xs"
            >
              {isSaving ? "Saving Account..." : "Save Beneficiary"}
            </Button>
          </div>
        </form>
      )}

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {accounts.length === 0 && !showForm && (
          <EmptyState
            emoji=""
            title="No Bank Accounts Saved"
            description="Add a bank account or UPI ID to enable instant payouts."
            compact
          />
        )}
        {accounts.map((acc) => {
          const isUpi = acc.bankName === "UPI";
          const displayAccount = getDisplayAccountNumber(isUpi, acc.upiId, acc.accountNumber);

          return (
            <div
              key={acc.id}
              className={`p-4 rounded-2xl border transition-all ${
                acc.isDefault
                  ? "border-primary/50 bg-card shadow-sm"
                  : "border-border bg-muted/20 hover:border-border/80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Account Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-heading font-bold text-base text-foreground">
                      {acc.bankName || "Bank Account"}
                    </span>
                    {acc.isDefault ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-verified-muted text-verified border border-verified-border flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Primary</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Linked
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-xs font-bold text-foreground">
                    {displayAccount}
                  </div>

                  <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                    <span>Beneficiary: <strong className="text-foreground">{acc.accountName}</strong></span>
                    {acc.ifscCode && <span>• IFSC: <strong className="font-mono text-foreground">{acc.ifscCode}</strong></span>}
                    {acc.upiId && !isUpi && <span>• UPI: <strong className="text-foreground">{acc.upiId}</strong></span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  {!acc.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(acc.id)}
                      className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                  {onSelectAccount && (
                    <button
                      type="button"
                      onClick={() => onSelectAccount(acc)}
                      className="text-xs font-bold text-verified bg-verified-muted hover:opacity-90 px-3 py-1 rounded-lg border border-verified-border cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(acc.id)}
                    className="text-xs text-muted-foreground hover:text-disputed p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer ml-auto sm:ml-0"
                    title="Delete account"
                    aria-label="Delete account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
