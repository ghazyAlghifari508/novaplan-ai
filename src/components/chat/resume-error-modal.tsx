"use client";

import { AlertCircle, X, Play } from "lucide-react";
import { ModelDropdown } from "./model-dropdown";
import type { Plan } from "@/types/database";
import { useState } from "react";

interface ResumeErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (selectedModelId: string) => void;
  errorMessage: string;
  userPlan: Plan;
  currentModelId: string;
}

export function ResumeErrorModal({
  isOpen,
  onClose,
  onResume,
  errorMessage,
  userPlan,
  currentModelId,
}: ResumeErrorModalProps) {
  const [selectedModel, setSelectedModel] = useState(currentModelId);

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
            AI Sedang Sibuk / Terputus
          </h3>
          <p className="font-schibsted text-text-gray dark:text-[#A0A0A0] text-sm mb-4 leading-relaxed">
            {errorMessage || "Terjadi kesalahan saat menyusun PRD."}
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg mb-6 border border-orange-200 dark:border-orange-900/50">
             <p className="text-xs font-schibsted text-orange-800 dark:text-orange-300">
               💡 <strong>Rekomendasi:</strong> PRD yang terpotong masih tersimpan. Silakan ganti model AI yang kamu gunakan, lalu klik Lanjutkan untuk meneruskan penulisan dari bagian terakhir.
             </p>
          </div>

          <div className="mb-4 flex flex-col gap-2">
            <label className="text-sm font-semibold font-schibsted text-primary-black dark:text-[#F0F0F0]">
              Pilih Model AI Pengganti
            </label>
            {/* Wrapper div to give positioning context to ModelDropdown if needed, but it works fine usually */}
            <div className="w-full flex items-center bg-light-gray-bg dark:bg-[#161616] rounded-lg p-2 border border-[var(--border-subtle)]">
               <ModelDropdown 
                 selectedModel={selectedModel}
                 onSelect={setSelectedModel}
                 userPlan={userPlan}
                 position="bottom"
               />
               <span className="text-xs text-text-gray dark:text-[#A0A0A0] ml-3">
                 (Model sebelumnya: {currentModelId})
               </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => onResume(selectedModel)}
              className="w-full py-3 px-4 btn-primary flex items-center justify-center gap-2 font-schibsted font-bold text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              <Play size={16} fill="currentColor" />
              Lanjutkan Generate
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-light-gray-bg dark:bg-[#161616] text-primary-black dark:text-[#F0F0F0] text-center font-schibsted font-medium text-sm rounded-lg hover:bg-border-subtle transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
