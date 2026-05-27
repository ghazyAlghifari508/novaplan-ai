"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getSetupPrompt, savePendingPrdPrompt } from "@/lib/prompt-handoff";

export function ManualSetupClient() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    appName: "",
    targetAudience: "",
    platform: "Web",
    techStack: "",
    mainFeatures: "",
    additionalNotes: "",
  });

  useEffect(() => {
    const setupPrompt = getSetupPrompt();
    if (!setupPrompt) return;

    setFormData((prev) => {
      if (prev.additionalNotes) return prev;
      return { ...prev, additionalNotes: setupPrompt };
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compile form data into a structured prompt
    const compiledPrompt = `Tolong buatkan PRD dengan spesifikasi detail berikut:
Nama Aplikasi: ${formData.appName || "Belum ditentukan"}
Platform: ${formData.platform}
Tech Stack: ${formData.techStack || "Bebas / Belum ditentukan"}
Target Pengguna: ${formData.targetAudience || "Umum"}
Fitur Utama yang Diinginkan:
${formData.mainFeatures || "Buatkan rekomendasi fitur yang sesuai"}

Catatan Tambahan/Ide Awal:
${formData.additionalNotes}`;

    savePendingPrdPrompt(compiledPrompt, "auto");
    router.push("/prd");
  };

  return (
    <div className="w-full max-w-2xl px-6">
      <Link
        href="/setup"
        className="inline-flex items-center gap-2 text-sm font-medium text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:text-[#F0F0F0] transition-colors mb-8 font-schibsted"
      >
        <ChevronLeft size={16} />
        Kembali ke pilihan
      </Link>

      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-border-subtle dark:border-white/10 p-8 shadow-sm">
        <h1 className="font-fustat text-2xl font-bold text-primary-black dark:text-[#F0F0F0] mb-2">
          Detail Spesifikasi Aplikasi
        </h1>
        <p className="font-schibsted text-text-gray dark:text-[#A0A0A0] mb-8 text-sm">
          Semakin detail informasi yang kamu berikan, semakin akurat dan relevan PRD yang
          akan di-generate oleh AI.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Nama Aplikasi / Proyek
            </label>
            <input
              type="text"
              required
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              placeholder="Contoh: WarungKasir, GoMart, dll."
              className="w-full rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Target Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E] appearance-none"
            >
              <option value="Web">Web Application</option>
              <option value="Mobile (iOS & Android)">Mobile (iOS & Android)</option>
              <option value="iOS Only">iOS Only</option>
              <option value="Android Only">Android Only</option>
              <option value="Desktop">Desktop</option>
              <option value="Cross-platform (Semua platform)">
                Cross-platform (Semua platform)
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Target Pengguna (Audience)
            </label>
            <input
              type="text"
              required
              value={formData.targetAudience}
              onChange={(e) =>
                setFormData({ ...formData, targetAudience: e.target.value })
              }
              placeholder="Contoh: Pemilik warung kelontong usia 30-50 tahun"
              className="w-full rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Tech Stack yang Diinginkan (Opsional)
            </label>
            <input
              type="text"
              value={formData.techStack}
              onChange={(e) =>
                setFormData({ ...formData, techStack: e.target.value })
              }
              placeholder="Contoh: Next.js, Tailwind, MongoDB"
              className="w-full rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Fitur Utama (Sebutkan poin-poinnya)
            </label>
            <textarea
              required
              value={formData.mainFeatures}
              onChange={(e) => setFormData({ ...formData, mainFeatures: e.target.value })}
              placeholder="Contoh:&#10;1. Pencatatan transaksi&#10;2. Manajemen stok barang&#10;3. Laporan harian"
              rows={4}
              className="w-full resize-none rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-schibsted text-sm font-medium text-primary-black dark:text-[#F0F0F0]">
              Catatan Tambahan / Ide Awal
            </label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) =>
                setFormData({ ...formData, additionalNotes: e.target.value })
              }
              placeholder="Tulis konteks atau masalah apa yang ingin dipecahkan oleh aplikasi ini..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border-subtle dark:border-white/10 bg-light-gray-bg dark:bg-[#161616] px-4 py-3 font-schibsted text-sm outline-none transition-all focus:border-primary-black/30 focus:bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="pt-4 border-t border-border-subtle dark:border-white/10">
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--btn-bg)] py-3.5 font-schibsted text-sm font-bold text-[var(--btn-text)] transition-opacity hover:opacity-90"
            >
              Mulai Generate PRD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
