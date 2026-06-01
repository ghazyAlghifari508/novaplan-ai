"use client";

import { Trash2, X } from "lucide-react";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

/**
 * Confirmation dialog for deleting a project.
 * Extracted from prd-detail.tsx.
 */
export function DeleteProjectModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteProjectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 size={24} strokeWidth={2} />
            </div>
            <button
              onClick={onClose}
              className="text-text-gray dark:text-[#A0A0A0] transition-colors hover:text-primary-black dark:text-[#F0F0F0]"
              aria-label="Tutup dialog"
            >
              <X size={20} />
            </button>
          </div>

          <h3
            id="delete-project-title"
            className="mb-2 mt-2 font-fustat text-xl font-bold text-primary-black dark:text-[#F0F0F0]"
          >
            Hapus Proyek?
          </h3>
          <p className="mb-6 font-schibsted text-sm leading-relaxed text-text-gray dark:text-[#A0A0A0]">
            Proyek dan riwayat PRD terkait akan dihapus. Tindakan ini tidak bisa dibatalkan.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-light-gray-bg dark:bg-[#161616] px-4 py-3 text-center font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0] transition-colors hover:bg-border-subtle"
              disabled={isDeleting}
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-4 py-3 text-center font-schibsted text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Hapus Proyek"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
