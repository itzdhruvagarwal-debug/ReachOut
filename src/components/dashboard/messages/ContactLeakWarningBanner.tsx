"use client";

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { ContactLeakResult } from "@/lib/contact-leak-detector";

export interface ContactLeakWarningBannerProps {
  leakResult: ContactLeakResult;
}

export function ContactLeakWarningBanner({ leakResult }: ContactLeakWarningBannerProps) {
  if (!leakResult.hasLeak) {
    return null;
  }

  return (
    <div className="mb-2 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs shadow-sm transition-all animate-fade-in">
      <div className="flex items-start gap-2.5">
        <div className="p-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <span>Safety Warning: External Contact Details Detected</span>
          </div>
          <p className="mt-0.5 leading-relaxed text-amber-800/90 dark:text-amber-200">
            <strong>Platform ke bahar contact share karna deal protection khatam kar sakta hai.</strong>{" "}
            VyaparMedia escrow security, payment guarantees, and dispute mediation apply only to
            agreements conducted directly within the platform.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {leakResult.detectedTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
