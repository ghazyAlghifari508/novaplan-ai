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
    success: "bg-accent-green text-black",
    error: "bg-red-600 text-white",
    info: "btn-primary",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div
        className={cn(
          "rounded-lg px-5 py-3 text-sm font-medium shadow-lg",
          variants[toastType || "info"]
        )}
      >
        {toastMessage}
      </div>
    </div>
  );
}