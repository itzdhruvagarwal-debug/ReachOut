"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface DrawerProps {
  readonly open?: boolean;
  readonly isOpen?: boolean;
  readonly onClose: () => void;
  readonly title?: React.ReactNode;
  readonly side?: "right" | "bottom" | "left";
  readonly maxWidth?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
  readonly "aria-label"?: string;
  readonly showCloseButton?: boolean;
}

/**
 * Universal Drawer & Bottom-Sheet Base Component.
 * Shares portal, escape-key listener, body scroll-lock, and accessible backdrop logic.
 */
export function Drawer({
  open,
  isOpen,
  onClose,
  title,
  side = "right",
  maxWidth,
  className = "",
  children,
  "aria-label": ariaLabel,
  showCloseButton = true,
}: Readonly<DrawerProps>) {
  const isVisible = Boolean(open ?? isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for Escape key to close
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isVisible]);

  if (!mounted) return null;

  // Animation variants by side
  const variants = {
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      containerClass: "justify-end items-stretch",
      panelClass: "h-full border-l",
    },
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
      containerClass: "justify-start items-stretch",
      panelClass: "h-full border-r",
    },
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      containerClass: "justify-center items-end",
      panelClass: "w-full rounded-t-3xl border-t max-h-[85vh]",
    },
  };

  const currentVariant = variants[side] || variants.right;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div className={`fixed inset-0 z-50 flex ${currentVariant.containerClass}`}>
          {/* Backdrop Overlay */}
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs w-full h-full cursor-pointer"
          />

          {/* Drawer / Sheet Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || (typeof title === "string" ? title : "Drawer")}
            initial={currentVariant.initial}
            animate={currentVariant.animate}
            exit={currentVariant.exit}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            {...(maxWidth ? { style: { maxWidth } } : {})}
            className={`relative bg-card border-border shadow-2xl z-10 flex flex-col overflow-hidden text-foreground ${currentVariant.panelClass} ${className}`}
          >
            {/* Grab handle for bottom sheets */}
            {side === "bottom" && (
              <div className="pt-3 pb-1 flex items-center justify-center shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Optional Title Header */}
            {title && (
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="font-bold text-base text-foreground">{title}</div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
