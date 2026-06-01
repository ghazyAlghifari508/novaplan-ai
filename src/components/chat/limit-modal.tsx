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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle size={24} strokeWidth={2} />
            </div>
            <button
              onClick={onClose}
              className="text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:text-[#F0F0F0] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="font-fustat text-xl font-bold text-primary-black dark:text-[#F0F0F0] mb-2 mt-2">
            Limit Tercapai
          </h3>
          <p className="font-schibsted text-text-gray dark:text-[#A0A0A0] text-sm mb-6 leading-relaxed">
            {errorMessage}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              onClick={onClose}
              className="w-full py-3 px-4 btn-primary text-center font-schibsted font-bold text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              🚀 Upgrade ke Hengker
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-light-gray-bg dark:bg-[#161616] text-primary-black dark:text-[#F0F0F0] text-center font-schibsted font-medium text-sm rounded-lg hover:bg-border-subtle transition-colors"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
