"use client";

import React, { useState, useRef, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 65; // px to trigger refresh
const MAX_PULL = 90; // max visible pull height

export default function PullToRefresh({
  onRefresh,
  children,
}: Readonly<PullToRefreshProps>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull-down if container is scrolled to the absolute top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0 && !isRefreshing) {
      startYRef.current = e.touches[0]!.clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0]!.clientY;
    const rawDelta = currentY - startYRef.current;

    if (rawDelta > 0) {
      // Damping resistance curve: delta^0.75
      const damped = Math.min(MAX_PULL, Math.pow(rawDelta, 0.75) * 2.2);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50); // Hold at spinner height
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const isTriggerReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full min-h-full"
    >
      {/* Pull indicator container */}
      <div
        style={{
          height: `${pullDistance}px`,
          transition: isPullingRef.current ? "none" : "height 0.3s ease-out",
        }}
        className="overflow-hidden flex items-center justify-center transition-all pointer-events-none"
        aria-hidden="true"
      >
        <div
          className={`w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center transition-transform ${
            isRefreshing ? "scale-100" : isTriggerReady ? "scale-110 text-primary" : "scale-90 text-muted-foreground"
          }`}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <ArrowDown
              className="w-4 h-4 transition-transform duration-200"
              style={{
                transform: `rotate(${Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
