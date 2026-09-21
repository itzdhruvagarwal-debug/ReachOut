"use client";

import { logger } from "@/lib/logger-client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formatUserError } from "@/lib/user-messages";
import {
  CampaignFormData,
  validateCampaignForm,
} from "@/components/dashboard/campaigns/create/CampaignCreateHelpers";
import { ProductSeedingCard } from "@/components/dashboard/campaigns/create/ProductSeedingCard";
import { DeliverablesList } from "@/components/dashboard/campaigns/create/DeliverablesList";
import { CampaignSummarySidebar } from "@/components/dashboard/campaigns/create/CampaignSummarySidebar";
import { ALL_CATEGORIES } from "@/lib/categories";
import { type DraftCampaignData, type DraftCampaignResponse } from "@/lib/schemas";
import {
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lock,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Users,
} from "lucide-react";

const INITIAL_FORM_DATA: CampaignFormData = {
  title: "",
  description: "",
  requirements: "",
  totalBudget: 5000,
  perInfluencerBudget: 1000,
  targetCategories: [],
  targetCities: [],
  targetGender: "ANY",
  targetAgeMin: null,
  targetAgeMax: null,
  minFollowers: 1000,
  maxFollowers: null,
  maxInfluencers: 5,
  applicationDeadline: "",
  contentDeadline: "",
  postingDeadline: "",
  requiresProduct: false,
  productName: "",
  productValue: 0,
  productDescription: "",
  deliverables: [{ type: "INSTAGRAM_POST", count: 1, rate: 1000 }],
};

function formatDateForInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0] || "";
}

function mapDraftCampaignToFormData(campaign: DraftCampaignData): CampaignFormData {
  return {
    title: campaign.title || "",
    description: campaign.description || "",
    requirements: campaign.requirements || "",
    totalBudget: (campaign.totalBudget || 0) / 100,
    perInfluencerBudget: (campaign.perInfluencerBudget || 0) / 100,
    targetCategories: campaign.targetCategories || [],
    targetCities: campaign.targetCities || [],
    targetGender: campaign.targetGender || "ANY",
    targetAgeMin: campaign.targetAgeMin ?? null,
    targetAgeMax: campaign.targetAgeMax ?? null,
    minFollowers: campaign.minFollowers || 0,
    maxFollowers: campaign.maxFollowers || null,
    maxInfluencers: campaign.maxInfluencers || null,
    applicationDeadline: formatDateForInput(campaign.applicationDeadline),
    contentDeadline: formatDateForInput(campaign.contentDeadline),
    postingDeadline: formatDateForInput(campaign.postingDeadline),
    requiresProduct: campaign.requiresProduct || false,
    productName: campaign.productName || "",
    productValue: (campaign.productValue || 0) / 100,
    productDescription: campaign.productDescription || "",
    deliverables: (campaign.deliverables || []).map((d) => ({
      type: d.type,
      count: d.count,
      rate: (d.rate || 0) / 100,
    })),
  };
}

function toggleCategorySelection(prevCategories: string[], cat: string): string[] {
  if (prevCategories.includes(cat)) {
    return prevCategories.filter((c) => c !== cat);
  }
  if (prevCategories.length >= 5) {
    return prevCategories;
  }
  return [...prevCategories, cat];
}

function computeCampaignBudgets(
  deliverables: Array<{ rate?: number; count?: number }>,
  maxInfluencers: number | null
) {
  const perInfluencer = deliverables.reduce(
    (sum, d) => sum + (d.rate || 0) * (d.count || 0),
    0
  );
  const total = maxInfluencers !== null
    ? perInfluencer * maxInfluencers
    : perInfluencer;
  return { perInfluencer, total };
}

type WizardStep = 1 | 2 | 3;

export default function CreateCampaignClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitedInfluencerId = searchParams.get("invite");
  const editCampaignId = searchParams.get("edit");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditDraftLoading, setIsEditDraftLoading] = useState(!!editCampaignId);
  const [invitedInfluencer, setInvitedInfluencer] = useState<{
    displayName: string;
    instagramHandle?: string;
    youtubeHandle?: string;
  } | null>(null);

  const [formData, setFormData] = useState<CampaignFormData>(INITIAL_FORM_DATA);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customCategory, setCustomCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([...ALL_CATEGORIES]);

  useEffect(() => {
    if (!invitedInfluencerId) return;
    const fetchInfluencer = async () => {
      try {
        const data = (await apiClient.users.getInfluencer(invitedInfluencerId)) as {
          influencer?: { displayName: string; instagramHandle?: string; youtubeHandle?: string };
        };
        if (data.influencer) {
          setInvitedInfluencer(data.influencer);
        }
      } catch (err) {
        logger.error("[campaign-create] Failed to fetch invited influencer details:", err);
      }
    };
    fetchInfluencer();
  }, [invitedInfluencerId]);

  const { data: draftData } = useSWR<DraftCampaignResponse>(
    editCampaignId ? `/api/campaigns/${editCampaignId}` : null,
    fetcher
  );

  useEffect(() => {
    if (!draftData) return;
    const campaign = draftData.campaign || draftData.data?.campaign;
    if (campaign?.status === "DRAFT") {
      setFormData(mapDraftCampaignToFormData(campaign));
    }
    setIsEditDraftLoading(false);
  }, [draftData]);

  const handleCategoryToggle = (cat: string) => {
    setFormData((prev) => ({
      ...prev,
      targetCategories: toggleCategorySelection(prev.targetCategories, cat),
    }));
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
      handleCategoryToggle(trimmed);
      setCustomCategory("");
    }
  };

  // Auto calculate perInfluencerBudget and totalBudget based on deliverables and maxInfluencers
  useEffect(() => {
    const { perInfluencer, total } = computeCampaignBudgets(
      formData.deliverables,
      formData.maxInfluencers
    );

    setFormData((prev) => {
      if (prev.perInfluencerBudget !== perInfluencer || prev.totalBudget !== total) {
        return {
          ...prev,
          perInfluencerBudget: perInfluencer,
          totalBudget: total,
        };
      }
      return prev;
    });
  }, [formData.deliverables, formData.maxInfluencers]);

  // Step Validation Checkers
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = "Campaign title is required";
    }
    if (!formData.description.trim()) {
      errors.description = "Campaign overview is required";
    }
    if (!formData.requirements.trim()) {
      errors.requirements = "Creator guidelines are required";
    }
    if (formData.targetCategories.length === 0) {
      setError("Please select at least one target category");
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors(errors);
    setError("");
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (formData.deliverables.length === 0) {
      setError("Please add at least one deliverable");
      return false;
    }
    if (formData.maxFollowers && formData.maxFollowers < formData.minFollowers) {
      errors.maxFollowers = "Max followers must be greater than min followers";
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors(errors);
    setError("");
    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setError("");
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const valResult = validateCampaignForm(formData);
    if (!valResult.success) {
      if (valResult.fieldErrors) setFieldErrors(valResult.fieldErrors);
      if (valResult.error) setError(valResult.error);
      return;
    }

    setIsLoading(true);

    try {
      const applicationDeadline = formData.applicationDeadline
        ? new Date(formData.applicationDeadline)
        : null;
      const contentDeadline = new Date(formData.contentDeadline);
      const postingDeadline = new Date(formData.postingDeadline);

      const payload = {
        ...formData,
        totalBudget: Math.round(formData.totalBudget),
        perInfluencerBudget: Math.round(formData.perInfluencerBudget),
        productValue: Math.round(formData.productValue || 0),
        deliverables: formData.deliverables.map((d) => ({
          ...d,
          rate: Math.round(d.rate || 0),
        })),
        maxFollowers: formData.maxFollowers || 0,
        maxInfluencers: formData.maxInfluencers || null,
        applicationDeadline: applicationDeadline?.toISOString(),
        contentDeadline: contentDeadline.toISOString(),
        postingDeadline: postingDeadline.toISOString(),
        invitedInfluencerId: invitedInfluencerId || undefined,
        status: isDraft ? "DRAFT" : "ACTIVE",
      };

      if (editCampaignId) {
        await apiClient.campaigns.update(editCampaignId, payload);
      } else {
        await apiClient.campaigns.create(payload);
      }

      router.push("/dashboard/campaigns");
      router.refresh();
    } catch (err: unknown) {
      setError(
        formatUserError(
          err,
          "Failed to save campaign. Please check the details and try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  let publishButtonContent: React.ReactNode = "Deposit Escrow & Launch Campaign";
  if (isLoading) {
    publishButtonContent = <span className="loading" />;
  } else if (editCampaignId) {
    publishButtonContent = "Save & Publish Changes";
  }

  if (isEditDraftLoading) {
    return (
      <div className="flex justify-center items-center p-20">
        <span className="loading" aria-label="Loading campaign draft..." />
      </div>
    );
  }

  const stepsList = [
    { num: 1, title: "Overview & Niche", desc: "Brief, guidelines & categories" },
    { num: 2, title: "Deliverables & Targeting", desc: "Milestones, rates & followers" },
    { num: 3, title: "Budget & Escrow", desc: "Deadlines & financial lock" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {editCampaignId ? "Edit Draft Campaign" : "Create New Campaign"}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {editCampaignId
            ? "Update your draft campaign details before publishing to creators"
            : "Launch an escrow-backed campaign and collaborate with verified Indian creators"}
        </p>
      </div>

      {/* Invited Creator Highlight Banner */}
      {invitedInfluencer && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs text-foreground">
            <span>Direct Invitation sent to: </span>
            <strong className="text-primary font-bold">
              @{invitedInfluencer.instagramHandle || invitedInfluencer.youtubeHandle || invitedInfluencer.displayName}
            </strong>{" "}
            ({invitedInfluencer.displayName})
          </div>
        </div>
      )}

      {/* ==================== 1. UPWORK-STYLE 3-STEP PROGRESS STEPPER ==================== */}
      <nav aria-label="Campaign Creation Progress" className="p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) {
                    setCurrentStep(step.num as WizardStep);
                  } else if (step.num === 2 && currentStep === 1) {
                    if (validateStep1()) setCurrentStep(2);
                  } else if (step.num === 3 && currentStep === 2) {
                    if (validateStep2()) setCurrentStep(3);
                  }
                }}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all text-left ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isCompleted
                    ? "bg-verified-muted text-verified hover:bg-verified-muted/80 cursor-pointer"
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? "bg-primary-foreground text-primary"
                      : isCompleted
                      ? "bg-verified text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs font-bold leading-tight truncate">
                    {step.title}
                  </p>
                  <p className={`text-[10px] truncate ${isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==================== 2. MAIN WIZARD LAYOUT (Split Screen Desktop) ==================== */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Form Column */}
        <div className="flex-1 w-full space-y-6">
          <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
            {error && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* -------------------- STEP 1: OVERVIEW & BRAND NICHE -------------------- */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="border-b border-border pb-3">
                    <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Step 1: Campaign Brief & Categories</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tell creators what your campaign is about and who should apply.
                    </p>
                  </div>

                  <Input
                    label="Campaign Title"
                    id="campaign-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g. Summer Skincare Glow Routine Reel & Launch"
                    error={fieldErrors.title}
                    fullWidth
                  />

                  <Textarea
                    label="Overview / Creative Brief"
                    id="campaign-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Describe your brand story, campaign goals, key messaging pillars, and target aesthetic..."
                    error={fieldErrors.description}
                    fullWidth
                    rows={3}
                  />

                  <Textarea
                    label="Creator Requirements & Guidelines"
                    id="campaign-requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    required
                    placeholder="Specific requirements (e.g. 'Must show product packaging in first 3 seconds', 'Include link sticker with coupon code GLOW20', 'No competitor mentions')..."
                    error={fieldErrors.requirements}
                    fullWidth
                    rows={3}
                  />

                  {/* Category Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground" htmlFor="custom-category-input">
                        Target Categories (Select up to 5)
                      </label>
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                        {formData.targetCategories.length}/5 Selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => {
                        const isSelected = formData.targetCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryToggle(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-muted text-foreground border-border hover:border-primary/50"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Category Input */}
                    <div className="flex gap-2 items-center pt-2">
                      <Input
                        id="custom-category-input"
                        type="text"
                        placeholder="Add custom niche category..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="max-w-xs text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomCategory();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddCustomCategory}
                        className="text-xs font-bold"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Demographic Targeting */}
                  <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Target Cities (Optional, Comma-Separated)"
                      id="target-cities"
                      type="text"
                      placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                      value={formData.targetCities.join(", ")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetCities: e.target.value
                            .split(",")
                            .map((c) => c.trim())
                            .filter(Boolean),
                        })
                      }
                      fullWidth
                    />

                    <Select
                      label="Target Audience Gender"
                      id="target-gender"
                      value={formData.targetGender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetGender: e.target.value,
                        })
                      }
                      fullWidth
                    >
                      <option value="ANY">Any Gender</option>
                      <option value="FEMALE">Female Focused</option>
                      <option value="MALE">Male Focused</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Min Target Age"
                      id="target-age-min"
                      type="number"
                      placeholder="e.g. 18"
                      value={formData.targetAgeMin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetAgeMin: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                        })
                      }
                      min={13}
                      fullWidth
                    />
                    <Input
                      label="Max Target Age"
                      id="target-age-max"
                      type="number"
                      placeholder="e.g. 35"
                      value={formData.targetAgeMax || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetAgeMax: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                        })
                      }
                      min={13}
                      fullWidth
                    />
                  </div>

                  {/* Step 1 Navigation */}
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => router.back()}
                      className="text-xs font-bold"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={goToNextStep}
                      className="inline-flex items-center gap-1.5 text-xs font-bold shadow-md shadow-primary/20"
                    >
                      <span>Next: Deliverables & Targeting</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* -------------------- STEP 2: DELIVERABLES & CREATOR TARGETING -------------------- */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-border pb-3">
                    <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      <span>Step 2: Deliverables & Creator Requirements</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure content milestones and creator audience tier criteria.
                    </p>
                  </div>

                  {/* Deliverables Builder */}
                  <DeliverablesList formData={formData} setFormData={setFormData} />

                  {/* Creator Follower Criteria & Slots */}
                  <div className="p-5 rounded-2xl border border-border bg-muted/40 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>Creator Audience Tier & Hiring Slots</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Min Followers Req."
                        id="min-followers"
                        type="number"
                        value={formData.minFollowers}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minFollowers: Number.parseInt(e.target.value, 10) || 0,
                          })
                        }
                        min={100}
                        error={fieldErrors.minFollowers}
                        fullWidth
                      />

                      <Input
                        label="Max Followers Req."
                        id="max-followers"
                        type="number"
                        value={formData.maxFollowers === null ? "" : formData.maxFollowers}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxFollowers: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                          })
                        }
                        min={1000}
                        placeholder="No upper limit"
                        error={fieldErrors.maxFollowers}
                        fullWidth
                      />

                      <Input
                        label="Max Influencer Slots"
                        id="max-influencers"
                        type="number"
                        value={formData.maxInfluencers === null ? "" : formData.maxInfluencers}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxInfluencers: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                          })
                        }
                        min={1}
                        max={100}
                        placeholder="e.g. 5 Creators"
                        error={fieldErrors.maxInfluencers}
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Physical Product Seeding Card */}
                  <ProductSeedingCard formData={formData} setFormData={setFormData} />

                  {/* Step 2 Navigation */}
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={goToPrevStep}
                      className="inline-flex items-center gap-1 text-xs font-bold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Overview</span>
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={goToNextStep}
                      className="inline-flex items-center gap-1.5 text-xs font-bold shadow-md shadow-primary/20"
                    >
                      <span>Next: Budget & Escrow Lock</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* -------------------- STEP 3: BUDGET, DEADLINES & LAUNCH -------------------- */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-border pb-3">
                    <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                      <Lock className="w-5 h-5 text-escrow" />
                      <span>Step 3: Milestone Deadlines & Escrow Commitment</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review schedule and finalize RBI-compliant escrow deposit parameters.
                    </p>
                  </div>

                  {/* Deadlines Timeline Inputs */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Milestone Timeline Schedule</span>
                    </h4>

                    <Input
                      label="Application Deadline (Optional)"
                      id="application-deadline"
                      type="date"
                      value={formData.applicationDeadline}
                      onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                      error={fieldErrors.applicationDeadline}
                      fullWidth
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Content Submission Deadline"
                        id="content-deadline"
                        type="date"
                        value={formData.contentDeadline}
                        onChange={(e) => setFormData({ ...formData, contentDeadline: e.target.value })}
                        required
                        error={fieldErrors.contentDeadline}
                        fullWidth
                      />

                      <Input
                        label="Final Public Posting Deadline"
                        id="posting-deadline"
                        type="date"
                        value={formData.postingDeadline}
                        onChange={(e) => setFormData({ ...formData, postingDeadline: e.target.value })}
                        required
                        error={fieldErrors.postingDeadline}
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Live Budget Confirmation Inputs */}
                  <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Calculated Commercial Rate
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                          Budget Per Influencer (₹)
                        </label>
                        <div className="p-3 rounded-xl bg-muted/60 border border-border font-black text-base tabular-nums text-foreground">
                          ₹{formData.perInfluencerBudget.toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          Auto-calculated from selected deliverables
                        </span>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                          Total Creator Pool (₹)
                        </label>
                        <div className="p-3 rounded-xl bg-muted/60 border border-border font-black text-base tabular-nums text-foreground">
                          ₹{formData.totalBudget.toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          For {formData.maxInfluencers || 1} creator slots
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Navigation & Submission Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={goToPrevStep}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 text-xs font-bold w-full sm:w-auto justify-center"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back: Deliverables</span>
                    </Button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={isLoading}
                        className="text-xs font-bold flex-1 sm:flex-initial"
                      >
                        {isLoading ? <span className="loading" /> : "Save as Draft"}
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-bold shadow-md shadow-primary/25 flex-1 sm:flex-initial"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{publishButtonContent}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* Right Sticky Summary Sidebar */}
        <CampaignSummarySidebar formData={formData} />
      </div>
    </div>
  );
}
