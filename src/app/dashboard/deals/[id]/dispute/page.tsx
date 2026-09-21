"use client";

import React, { useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { logger } from "@/lib/logger-client";
import { apiClient } from "@/lib/api-client";
import { formatUserError } from "@/lib/user-messages";
import { Button, Textarea, ToastContainer, type ToastItem, type ToastType, Skeleton } from "@/components/ui";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { formatCurrency } from "@/lib/utils-client";
import { createDisputeSchema } from "@/lib/validations/campaign";
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Film,
  DollarSign,
  Trash2,
  ShieldAlert,
  HelpCircle,
  Building2,
  User,
  ShieldCheck,
} from "lucide-react";

interface DisputePageProps {
  readonly params: Promise<{ readonly id: string }>;
}

type DisputeIssueType =
  | "TIMELINE"
  | "QUALITY"
  | "PAYMENT"
  | "CONTENT_DELETED"
  | "TERMS_VIOLATION"
  | "OTHER";

interface DisputeOption {
  type: DisputeIssueType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DISPUTE_OPTIONS: DisputeOption[] = [
  {
    type: "TIMELINE",
    title: "Missed Deadlines & Delays",
    description: "Milestone draft or final posting is delayed beyond agreed dates without notice.",
    icon: Clock,
  },
  {
    type: "QUALITY",
    title: "Quality & Brief Mismatch",
    description: "Delivered content diverges significantly from the brief guidelines or brand voice.",
    icon: Film,
  },
  {
    type: "PAYMENT",
    title: "Payment or Milestone Conflict",
    description: "Discrepancy in milestone payout amounts or deliverables schedule.",
    icon: DollarSign,
  },
  {
    type: "CONTENT_DELETED",
    title: "Post Deleted Prematurely",
    description: "Creator removed or archived the sponsored content before the agreed retention period.",
    icon: Trash2,
  },
  {
    type: "TERMS_VIOLATION",
    title: "Terms of Service Violation",
    description: "Off-platform payment solicitation, confidentiality breach, or improper conduct.",
    icon: ShieldAlert,
  },
  {
    type: "OTHER",
    title: "Other Contractual Conflict",
    description: "Any other issue that cannot be resolved directly between brand and creator.",
    icon: FileWarning,
  },
];

export default function DealDisputePage({ params }: Readonly<DisputePageProps>) {
  const { id: dealId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  // 2-Step Guided Wizard State (Step 1: Category, Step 2: Statement & Terms)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Fetch Deal context
  const { data: dealResponse, isLoading: isDealLoading } = useSWR<{
    success: boolean;
    deal?: {
      id: string;
      amount: number;
      status: string;
      campaign?: { title: string };
      influencer?: { displayName?: string; name?: string };
      brand?: { companyName?: string; name?: string };
    };
    data?: {
      id: string;
      amount: number;
      status: string;
      campaign?: { title: string };
      influencer?: { displayName?: string; name?: string };
      brand?: { companyName?: string; name?: string };
    };
  }>(dealId ? `/api/deals/${dealId}` : null, fetcher);

  const deal = useMemo(
    () => dealResponse?.deal || dealResponse?.data || null,
    [dealResponse]
  );

  const [issueType, setIssueType] = useState<DisputeIssueType>("TIMELINE");
  const [description, setDescription] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const selectedOption = useMemo(
    () => DISPUTE_OPTIONS.find((opt) => opt.type === issueType) || DISPUTE_OPTIONS[0]!,
    [issueType]
  );

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const showToast = (type: ToastType, message: string) => {
    const toastId = String(Date.now());
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(() => removeToast(toastId), 5000);
  };

  const charCount = description.trim().length;
  const isDescriptionValid = charCount >= 50;

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = createDisputeSchema.safeParse({
      type: issueType,
      description: description.trim(),
    });

    if (!validation.success) {
      showToast(
        "error",
        validation.error.issues[0]?.message || "Invalid dispute details."
      );
      return;
    }

    if (!acceptedTerms) {
      showToast("error", "Please confirm that you have read the escrow mediation terms.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = (await apiClient.settings.createDispute({
        action: "create",
        dealId,
        type: issueType,
        description: description.trim(),
      })) as { success?: boolean; message?: string; error?: string; disputeId?: string };

      if (data?.success) {
        showToast(
          "success",
          data?.message || "Dispute registered. Opening neutral resolution room..."
        );
        router.push(`/dashboard/deals/${dealId}`);
      } else {
        showToast(
          "error",
          formatUserError(data?.error, "Failed to raise dispute. Please try again.")
        );
      }
    } catch (error) {
      logger.error("[deal-dispute] Failed to raise dispute:", error);
      showToast(
        "error",
        formatUserError(error, "Failed to raise dispute. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell user={session?.user}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/deals/${dealId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Deal Room
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <Scale className="w-7 h-7 text-primary" />
              File an Escrow Dispute
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upwork-style 2-step guided mediation wizard for protected escrow deals
            </p>
          </div>

          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            Dispute Policies
          </Link>
        </div>

        {/* 2-Step Progress Stepper Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex-1 flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                currentStep === 1
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/40 hover:bg-muted/70"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 1
                    ? "bg-primary text-white"
                    : "bg-verified text-white"
                }`}
              >
                {currentStep === 2 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground">
                  1. Issue Category
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {selectedOption.title}
                </div>
              </div>
            </button>

            {/* Stepper Divider */}
            <div className="w-6 h-0.5 bg-border hidden sm:block" />

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex-1 flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                currentStep === 2
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/40 hover:bg-muted/70"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 2
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground">
                  2. Statement & Terms
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {isDescriptionValid ? "Statement Ready" : "Min 50 Chars Required"}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Deal Context Preview Card */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/50">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Protected Contract Details
            </span>
            {deal?.amount ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 tabular-nums">
                <Lock className="w-3.5 h-3.5" />
                {formatCurrency(deal.amount)} in Neutral Escrow
              </span>
            ) : null}
          </div>

          {isDealLoading ? (
            <div className="space-y-2">
              <Skeleton width="60%" height={20} borderRadius={4} />
              <Skeleton width="40%" height={16} borderRadius={4} />
            </div>
          ) : deal ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {deal.campaign?.title || "Campaign Deal"}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                  {deal.brand && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Brand: {deal.brand.companyName || deal.brand.name}
                    </span>
                  )}
                  {deal.influencer && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Creator: {deal.influencer.displayName || deal.influencer.name}
                    </span>
                  )}
                  <span className="font-mono text-[11px]">
                    Deal #{deal.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground self-start sm:self-center">
                Status: {deal.status.replaceAll("_", " ")}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Deal #{dealId.slice(-6).toUpperCase()}
            </div>
          )}
        </div>

        {/* 2-Step Guided Wizard Content */}
        {currentStep === 1 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-black">
                  1
                </span>
                Select Issue Category
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the category that best captures the conflict. This enables the automated mediator to pull the relevant contract clauses.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {DISPUTE_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                const isSelected = issueType === option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setIssueType(option.type)}
                    className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-sm"
                        : "bg-background/60 border-border hover:border-border/80"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-xs font-bold text-foreground">
                        {option.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                        {option.description}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary absolute right-3 top-3.5 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Step 1 Footer Action */}
            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Link
                href={`/dashboard/deals/${dealId}`}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
              >
                Cancel & Return
              </Link>

              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl"
              >
                Continue to Statement (Step 2)
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
              {/* Category Confirmation Chip */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center">
                    <selectedOption.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      Category: {selectedOption.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {selectedOption.description}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="text-xs font-semibold text-primary hover:underline px-2 py-1"
                >
                  Change
                </button>
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-black">
                    2
                  </span>
                  Describe the Conflict in Detail
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Provide an objective, detailed account of the issue, dates, and what specific resolution you are requesting.
                </p>
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Dispute Statement & Requested Remedy"
                  id="description-textarea"
                  rows={6}
                  placeholder="Detail what went wrong, which deliverables were affected, and how you attempted to communicate with the counterparty..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  fullWidth
                />

                <div className="flex justify-between items-center text-xs">
                  <span
                    className={`font-semibold tabular-nums ${
                      isDescriptionValid ? "text-verified" : "text-disputed"
                    }`}
                  >
                    {charCount} / 50 minimum characters required
                  </span>
                  {isDescriptionValid && (
                    <span className="text-verified flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Requirement met
                    </span>
                  )}
                </div>
              </div>

              {/* Arbitration Policy Warning */}
              <div className="bg-pending-muted/40 border border-pending-border rounded-xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-pending flex-shrink-0 mt-0.5" />
                <div className="text-xs text-foreground/90 space-y-1">
                  <strong className="font-bold text-foreground">
                    Escrow Freezing & Mediation Procedure
                  </strong>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Upon submission, deal milestone progression is immediately paused and funds are locked under platform holding. Tier 1 automated analysis will review both parties' claims and propose a binding settlement within 48 hours.
                  </p>
                </div>
              </div>

              {/* Terms Acknowledgment Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer pt-2 select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I confirm that I have attempted to resolve this directly with the other party and acknowledge that filing a dispute initiates formal escrow mediation under platform terms.
                </span>
              </label>

              {/* Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevStep}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Step 1
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/dashboard/deals/${dealId}`}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-center bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                  >
                    Cancel
                  </Link>

                  <Button
                    type="submit"
                    variant="danger"
                    disabled={isSubmitting || !isDescriptionValid || !acceptedTerms}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                  >
                    {isSubmitting ? "Filing Dispute..." : "Submit Dispute & Open Room"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
