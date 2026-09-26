"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatUserError } from "@/lib/user-messages";
import { Skeleton, Button } from "@/components/ui";
import { CampaignRoiReport, type RoiReportData } from "@/components/dashboard/campaigns/CampaignRoiReport";

interface RoiClientProps {
  campaignId: string;
}

export function RoiClient({ campaignId }: RoiClientProps) {
  const [data, setData] = useState<RoiReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.campaigns.getRoiReport(campaignId);
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error("Unable to retrieve campaign ROI analytics");
      }
    } catch (err: unknown) {
      setError(formatUserError(err, "Failed to load campaign ROI metrics. Please verify campaign ownership."));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchRoi();
  }, [fetchRoi]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between no-print">
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaign Workspace</span>
        </Link>

        <button
          type="button"
          onClick={fetchRoi}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh real-time analytics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Realtime</span>
        </button>
      </div>

      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-destructive">Analytics Load Error</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
          </div>
          <Button onClick={fetchRoi} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && data && (
        <CampaignRoiReport data={data} campaignId={campaignId} onRefresh={fetchRoi} />
      )}
    </div>
  );
}
