"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";

export function Toast() {
  const { toastMessage, toastType, hideToast } = useUIStore();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(hideToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, hideToast]);

  if (!toastMessage) return null;

  const variants = {
    success: "bg-emerald text-white",
    error: "bg-crimson text-white",
    info: "btn-primary",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div
        className={cn(
        "rounded-md px-5 py-3 text-sm font-[510] shadow-[var(--shadow-overlay)]",
          variants[toastType || "info"]
        )}
      >
        {toastMessage}
      </div>
    </div>
  );
}
