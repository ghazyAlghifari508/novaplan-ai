"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, PenTool } from "lucide-react";
import { getSetupPrompt, savePendingPrdPrompt } from "@/lib/prompt-handoff";

export function SetupClient() {
  const router = useRouter();
  const promptRef = useRef("");

  useEffect(() => {
    const prompt = getSetupPrompt();
    if (!prompt || prompt.trim() === "") {
      router.push("/");
      return;
    }
    promptRef.current = prompt;
  }, [router]);

  const handleAutoSelect = () => {
    savePendingPrdPrompt(promptRef.current, "auto");
    router.push("/prd");
  };

  const handleManualSelect = () => {
    router.push("/setup/manual");
  };

  return (
    <div className="w-full max-w-4xl px-6">
      <div className="text-center mb-12">
        <h1 className="font-fustat text-3xl font-bold text-primary-black dark:text-[#F0F0F0] mb-4">
          Bagaimana kamu ingin memulai?
        </h1>
        <p className="font-schibsted text-text-gray dark:text-[#A0A0A0] max-w-xl mx-auto leading-relaxed">
          Pilih metode pembuatan PRD yang paling sesuai dengan kebutuhanmu. Kamu bisa
          membiarkan AI mengatur semuanya, atau menentukan detailnya sendiri.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Auto Card */}
        <button
          onClick={handleAutoSelect}
          className="group relative flex flex-col items-center p-8 rounded-2xl bg-white dark:bg-[#1E1E1E] border-2 border-border-subtle dark:border-white/10 hover:border-accent-green/50 hover:shadow-xl hover:shadow-accent-green/10 transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-primary-black/20"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-green/20 text-accent-green-hover group-hover:scale-110 transition-transform duration-300">
            <Sparkles size={32} strokeWidth={2} />
          </div>
          <h2 className="font-fustat text-xl font-bold text-primary-black dark:text-[#F0F0F0] mb-3 text-center">
            Biarkan AI Memilih
          </h2>
          <p className="font-schibsted text-sm text-text-gray dark:text-[#A0A0A0] text-center leading-relaxed">
            AI akan langsung merancang PRD lengkap secara otomatis berdasarkan ide kamu.
            Cepat, praktis, dan siap direvisi nanti.
          </p>
          <div className="mt-8 px-6 py-2 rounded-full btn-primary font-schibsted text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            Generate Otomatis
          </div>
        </button>

        {/* Manual Card */}
        <button
          onClick={handleManualSelect}
          className="group relative flex flex-col items-center p-8 rounded-2xl bg-white dark:bg-[#1E1E1E] border-2 border-border-subtle dark:border-white/10 hover:border-primary-black/20 hover:shadow-xl transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-primary-black/20"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-light-gray-bg dark:bg-[#161616] text-primary-black dark:text-[#F0F0F0] group-hover:scale-110 transition-transform duration-300">
            <PenTool size={32} strokeWidth={2} />
          </div>
          <h2 className="font-fustat text-xl font-bold text-primary-black dark:text-[#F0F0F0] mb-3 text-center">
            Pilih Sendiri
          </h2>
          <p className="font-schibsted text-sm text-text-gray dark:text-[#A0A0A0] text-center leading-relaxed">
            Isi formulir dengan detail seperti target pengguna, fitur utama, dan platform
            yang diinginkan agar PRD lebih spesifik.
          </p>
          <div className="mt-8 px-6 py-2 rounded-full border-2 border-primary-black text-primary-black dark:text-[#F0F0F0] font-schibsted text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            Isi Form Detail
          </div>
        </button>
      </div>
    </div>
  );
}
