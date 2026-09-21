"use client";

import React from "react";
import { Search, X, ArrowUpDown } from "lucide-react";
import { ALL_CATEGORIES } from "@/lib/categories";

interface CampaignFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

const categories = ["All", ...ALL_CATEGORIES];

export function CampaignFiltersBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
}: Readonly<CampaignFiltersBarProps>) {
  return (
    <div className="space-y-3.5 mb-6">
      {/* Search Input & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="search-campaigns-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by brand, title, or keywords..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            aria-label="Search campaigns"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear campaign search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="relative sm:w-56 shrink-0">
          <select
            id="sort-campaigns-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full py-2.5 pl-3.5 pr-9 rounded-xl border border-input bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium appearance-none cursor-pointer"
            aria-label="Sort campaigns"
          >
            <option value="newest">Newest First</option>
            <option value="budget_high">Budget: High to Low</option>
            <option value="budget_low">Budget: Low to High</option>
            <option value="deadline">Deadline: Ending Soon</option>
          </select>
          <ArrowUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Horizontally Scrollable Category Chips Carousel (Instagram Explore Style) */}
      <nav
        aria-label="Campaign category filters"
        className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1"
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border hover:border-border/80"
              }`}
            >
              {category}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
