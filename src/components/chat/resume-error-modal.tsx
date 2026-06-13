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
            AI Sedang Sibuk / Terputus
          </h3>
          <p className="mb-4 font-inter text-sm leading-relaxed text-fog">
            {errorMessage || "Terjadi kesalahan saat menyusun PRD."}
          </p>
          <div className="mb-6 rounded-md bg-indigo/10 p-3 shadow-[inset_0_0_0_1px_rgba(94,106,210,0.35)]">
             <p className="font-inter text-xs text-mist">
               💡 <strong>Rekomendasi:</strong> PRD yang terpotong masih tersimpan. Silakan ganti model AI yang kamu gunakan, lalu klik Lanjutkan untuk meneruskan penulisan dari bagian terakhir.
             </p>
          </div>

          <div className="mb-4 flex flex-col gap-2">
            <label className="font-inter text-sm font-[510] text-mist">
              Pilih Model AI Pengganti
            </label>
            {/* Wrapper div to give positioning context to ModelDropdown if needed, but it works fine usually */}
            <div className="flex w-full items-center rounded-md bg-charcoal p-2 shadow-[var(--shadow-inset)]">
               <ModelDropdown 
                 selectedModel={selectedModel}
                 onSelect={setSelectedModel}
                 userPlan={userPlan}
                 position="bottom"
               />
               <span className="ml-3 text-xs text-fog">
                 (Model sebelumnya: {currentModelId})
               </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => onResume(selectedModel)}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-inter text-sm font-[510] transition-all hover:brightness-105"
            >
              <Play size={16} fill="currentColor" />
              Lanjutkan Generate
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-charcoal px-4 py-3 text-center font-inter text-sm font-[510] text-mist shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
