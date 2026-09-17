"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscoveryFilters, DiscoveryMode } from "./types";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DiscoveryFilters;
  onApplyFilters: (filters: DiscoveryFilters) => void;
  mode: DiscoveryMode;
}

const NICHES = [
  "All",
  "Tech & Gadgets",
  "Fashion & Style",
  "Beauty & Skincare",
  "Fitness & Health",
  "Fintech & Crypto",
  "Food & Beverage",
  "Travel & Hospitality",
  "Lifestyle",
  "Gaming & Esports",
];

const CITIES = [
  "All India",
  "Mumbai",
  "Delhi-NCR",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
];

const CAMPAIGN_BUDGET_RANGES = [
  { label: "All Budgets", min: undefined, max: undefined },
  { label: "Under ₹15,000", min: 0, max: 1500000 },
  { label: "₹15,000 – ₹50,000", min: 1500000, max: 5000000 },
  { label: "₹50,000 – ₹2,00,000", min: 5000000, max: 20000000 },
  { label: "₹2,00,000+", min: 20000000, max: undefined },
];

const CREATOR_FOLLOWER_RANGES = [
  { label: "All Sizes", min: undefined, max: undefined },
  { label: "Nano (< 10K)", min: 0, max: 10000 },
  { label: "Micro (10K – 50K)", min: 10000, max: 50000 },
  { label: "Mid-Tier (50K – 500K)", min: 50000, max: 500000 },
  { label: "Macro (500K+)", min: 500000, max: undefined },
];

export default function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  mode,
}: Readonly<FilterBottomSheetProps>) {
  const [localFilters, setLocalFilters] = useState<DiscoveryFilters>(filters);

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  const handleNicheSelect = (niche: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      niche: niche === "All" ? undefined : niche,
    }));
  };

  const handleCitySelect = (city: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      city: city === "All India" ? undefined : city,
    }));
  };

  const handleSortSelect = (sort: DiscoveryFilters["sortBy"]) => {
    setLocalFilters((prev) => ({
      ...prev,
      sortBy: sort,
    }));
  };

  const handleReset = () => {
    const cleared: DiscoveryFilters = {};
    setLocalFilters(cleared);
    onApplyFilters(cleared);
    onClose();
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const activeCount = Object.values(localFilters).filter(Boolean).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-Up Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-border shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filter & Sort Options"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex items-center justify-center">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Filters & Sorting
                </h3>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Sort By Section */}
              <div>
                <label className="block text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
                  Sort By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "relevance", label: "Most Relevant" },
                    { id: "budget", label: mode === "campaigns" ? "Highest Budget" : "Starting Rate" },
                    { id: "rating", label: "Top Trust Score" },
                    { id: "recency", label: "Recently Added" },
                  ].map((opt) => {
                    const isSelected = (localFilters.sortBy || "relevance") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSortSelect(opt.id as DiscoveryFilters["sortBy"])}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/60 text-foreground border-border/80 hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Niche / Category Section */}
              <div>
                <label className="block text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
                  Niche / Industry
                </label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => {
                    const isSelected =
                      (n === "All" && !localFilters.niche) || localFilters.niche === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNicheSelect(n)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                            : "bg-muted/40 text-foreground border-border/80 hover:bg-muted"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode-specific Range Section (Budget vs Followers) */}
              {mode === "campaigns" ? (
                <div>
                  <label className="block text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
                    Budget Range
                  </label>
                  <div className="space-y-2">
                    {CAMPAIGN_BUDGET_RANGES.map((r, idx) => {
                      const isSelected =
                        localFilters.minBudget === r.min && localFilters.maxBudget === r.max;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              minBudget: r.min,
                              maxBudget: r.max,
                            }))
                          }
                          className={`w-full py-2 px-3.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-primary/10 text-primary border-primary font-semibold"
                              : "bg-muted/40 text-foreground border-border/80 hover:bg-muted"
                          }`}
                        >
                          <span>{r.label}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
                    Follower Audience Size
                  </label>
                  <div className="space-y-2">
                    {CREATOR_FOLLOWER_RANGES.map((r, idx) => {
                      const isSelected =
                        localFilters.minFollowers === r.min && localFilters.maxFollowers === r.max;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              minFollowers: r.min,
                              maxFollowers: r.max,
                            }))
                          }
                          className={`w-full py-2 px-3.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-primary/10 text-primary border-primary font-semibold"
                              : "bg-muted/40 text-foreground border-border/80 hover:bg-muted"
                          }`}
                        >
                          <span>{r.label}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div>
                <label className="block text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2.5">
                  Target Location
                </label>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((city) => {
                    const isSelected =
                      (city === "All India" && !localFilters.city) || localFilters.city === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                            : "bg-muted/40 text-foreground border-border/80 hover:bg-muted"
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-4 border-t border-border/80 bg-card/95 backdrop-blur-md flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border/80 text-foreground font-semibold text-xs hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
