"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CampaignProofItem } from "./types";
import {
  X,
  ShieldCheck,
  Lock,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  IndianRupee,
} from "lucide-react";

interface CampaignProofModalProps {
  proof: CampaignProofItem | null;
  onClose: () => void;
}

export default function CampaignProofModal({
  proof,
  onClose,
}: Readonly<CampaignProofModalProps>) {
  if (!proof) return null;

  const formattedAmount = (proof.amountPaise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proof-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
                {proof.brandAvatar ? (
                  <Image
                    src={proof.brandAvatar}
                    alt={proof.brandName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-foreground">
                    {proof.brandName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {proof.brandName}
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-verified" />
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Completed on {new Date(proof.completedDate).toLocaleDateString()}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Media Banner */}
            <div className="relative aspect-[16/9] w-full rounded-2xl bg-muted overflow-hidden">
              {proof.coverImage ? (
                <Image
                  src={proof.coverImage}
                  alt={proof.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-escrow/10 via-card to-muted p-6 text-center">
                  <Lock className="w-8 h-8 text-escrow mb-2" />
                  <span className="text-sm font-bold text-foreground">Verified Escrow Deliverable</span>
                </div>
              )}

              {/* Escrow Badge Overlay */}
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-escrow-muted/95 text-escrow border-escrow-border shadow-md">
                  <Lock className="w-3.5 h-3.5" />
                  <span>₹{formattedAmount} Escrow Released</span>
                </span>
              </div>
            </div>

            {/* Campaign Brief & Title */}
            <div>
              <h3 id="proof-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                {proof.title}
              </h3>
              {proof.outcomeMetric && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{proof.outcomeMetric}</span>
                </div>
              )}
            </div>

            {/* Deliverables Checklist */}
            {proof.deliverables && proof.deliverables.length > 0 && (
              <div className="p-4 rounded-2xl bg-muted/50 border border-border/60">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Verified Deliverables</span>
                </h5>
                <ul className="space-y-1.5">
                  {proof.deliverables.map((d, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-verified shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Brand Testimonial / Review */}
            {proof.reviewComment && (
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Brand Feedback</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span className="text-xs font-bold text-foreground">{proof.rating || 5}.0</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{proof.reviewComment}&rdquo;
                </p>
              </div>
            )}

            {/* Escrow Guarantee Box */}
            <div className="p-3.5 rounded-xl border border-verified-border bg-verified-muted flex items-center gap-2.5 text-xs text-verified">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Funds were held in VyaparMedia escrow and released automatically upon brand milestone approval.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
