"use client";

import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
}

/**
 * Modal overlay shown when the user has reached their PRD/revision limit.
 * Extracted from chat-panel.tsx for reusability and readability.
 */
export function LimitModal({ isOpen, onClose, errorMessage }: LimitModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-obsidian shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-crimson/10 text-crimson">
              <AlertCircle size={24} strokeWidth={2} />
            </div>
            <button
              onClick={onClose}
              className="text-fog transition-colors hover:text-snow"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="mb-2 mt-2 font-inter text-xl font-[510] text-snow">
            Limit Tercapai
          </h3>
          <p className="mb-6 font-inter text-sm leading-relaxed text-fog">
            {errorMessage}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              onClick={onClose}
              className="btn-primary w-full rounded-md px-4 py-3 text-center font-inter text-sm font-[510] transition-all hover:brightness-105"
            >
              🚀 Upgrade ke Hengker
            </Link>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-charcoal px-4 py-3 text-center font-inter text-sm font-[510] text-mist shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
