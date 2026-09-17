"use client";

import React, { useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { Card } from "@/components/ui";
import { formatContractDate, ContentSubmission, ContentUrlEntry } from "./DealDetailHelpers";
import { History, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ContentSubmissionsCardProps {
  readonly submissions?: ContentSubmission[] | undefined;
}

export function ContentSubmissionsCard({ submissions }: Readonly<ContentSubmissionsCardProps>) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  if (!submissions || submissions.length === 0) {
    return (
      <EmptyState
        emoji=""
        title="No Submissions Yet"
        description="Deliverable submissions and revision versions will appear here once submitted."
        compact
      />
    );
  }

  return (
    <Card className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base sm:text-lg">Deliverables & Version History</h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary font-semibold text-secondary">
          {submissions.length} {submissions.length === 1 ? "Version" : "Versions"}
        </span>
      </div>

      <div className="space-y-4">
        {submissions.map((sub, index) => {
          const versionNumber = sub.version || (submissions.length - index);
          const isLatest = index === 0;
          const isExpanded = expandedVersion === versionNumber || (isLatest && expandedVersion === null);
          const notes = sub.notes || "";
          const subUrls: ContentUrlEntry[] = Array.isArray(sub.contentUrls) ? sub.contentUrls : [];

          let statusBadge = (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="w-3 h-3" /> Under Review
            </span>
          );

          if (sub.status === "APPROVED") {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </span>
            );
          } else if (sub.status === "REVISION_REQUESTED") {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3 h-3" /> Revision Requested
              </span>
            );
          }

          return (
            <div
              key={sub.id || `version-${versionNumber}`}
              className={`rounded-xl border transition-all overflow-hidden ${
                isLatest
                  ? "border-primary/40 bg-card shadow-sm"
                  : "border-border bg-secondary/15"
              }`}
            >
              {/* Version Accordion Header */}
              <button
                type="button"
                onClick={() => setExpandedVersion(isExpanded ? -1 : versionNumber)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-secondary/40 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                    isLatest ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}>
                    v{versionNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {isLatest ? "Latest Deliverable" : `Submission v${versionNumber}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-secondary">
                      Submitted on {formatContractDate(sub.submittedAt || sub.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusBadge}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-secondary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  )}
                </div>
              </button>

              {/* Version Details Collapsible Content */}
              {isExpanded && (
                <div className="p-3.5 sm:p-4 pt-0 space-y-3 border-t border-border/50">
                  {/* Brand Rejection / Revision Note */}
                  {sub.feedback && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Brand Feedback:</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &ldquo;{sub.feedback}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Deliverable Items */}
                  <div className="space-y-2">
                    {subUrls.length > 0 ? (
                      subUrls.map((urlObj: ContentUrlEntry) => (
                        <div
                          key={urlObj.type}
                          className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-lg border border-border text-xs"
                        >
                          <div>
                            <span className="font-semibold capitalize block">
                              {urlObj.type.replace(/_\d+$/, "").replaceAll("_", " ")}
                            </span>
                            {urlObj.feedback && (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                Note: {urlObj.feedback}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {urlObj.status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                urlObj.status === "APPROVED"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : urlObj.status === "REVISION_REQUESTED"
                                  ? "bg-rose-500/15 text-rose-600"
                                  : "bg-secondary text-secondary"
                              }`}>
                                {urlObj.status}
                              </span>
                            )}
                            <a
                              href={urlObj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : sub.contentUrl ? (
                      <div className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-lg border border-border text-xs">
                        <span className="font-semibold">Deliverable Media Link</span>
                        <a
                          href={sub.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* Influencer Submission Notes */}
                  {notes.trim() && (
                    <div className="p-3 bg-secondary/30 rounded-lg text-xs text-secondary">
                      <strong className="text-foreground">Creator Notes:</strong> {notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
