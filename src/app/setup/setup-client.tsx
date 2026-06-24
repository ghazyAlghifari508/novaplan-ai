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
    const originalMessage = sessionStorage.getItem("novaplan:original-message") || undefined;
    savePendingPrdPrompt(promptRef.current, "auto", originalMessage);
    router.push("/prd");
  };

  const handleManualSelect = () => {
    router.push("/setup/manual");
  };

  return (
    <div className="w-full max-w-4xl px-6">
      <div className="text-center mb-12">
        <h1 className="font-inter text-3xl font-[510] text-snow mb-4" style={{ color: "var(--text-primary)" }}>
          Bagaimana kamu ingin memulai?
        </h1>
        <p className="font-inter text-fog max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Pilih metode pembuatan PRD yang paling sesuai dengan kebutuhanmu. Kamu bisa
          membiarkan AI mengatur semuanya, atau menentukan detailnya sendiri.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Auto Card */}
        <button
          onClick={handleAutoSelect}
          className="group relative flex w-full flex-col items-center rounded-2xl border border-(--border-subtle) p-8 text-left transition-all duration-300 hover:border-(--text-secondary) shadow-(--shadow-surface) hover:shadow-(--shadow-focus)"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-(--shadow-inset)" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
            <Sparkles size={32} strokeWidth={2} />
          </div>
          <h2 className="font-inter text-xl font-[510] mb-3 text-center" style={{ color: "var(--text-primary)" }}>
            Biarkan AI Memilih
          </h2>
          <p className="font-inter text-sm text-center leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            AI akan langsung merancang PRD lengkap secara otomatis berdasarkan ide kamu.
            Cepat, praktis, dan siap direvisi nanti.
          </p>
          <div className="mt-8 px-6 py-2 rounded-full btn-primary font-inter text-sm font-[510] opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            Generate Otomatis
          </div>
        </button>

        {/* Manual Card */}
        <button
          onClick={handleManualSelect}
          className="group relative flex w-full flex-col items-center rounded-2xl border border-(--border-subtle) p-8 text-left transition-all duration-300 hover:border-(--text-secondary) shadow-(--shadow-surface) hover:shadow-(--shadow-focus)"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-(--shadow-inset)" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
            <PenTool size={32} strokeWidth={2} />
          </div>
          <h2 className="font-inter text-xl font-[510] mb-3 text-center" style={{ color: "var(--text-primary)" }}>
            Pilih Sendiri
          </h2>
          <p className="font-inter text-sm text-center leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Isi formulir dengan detail seperti target pengguna, fitur utama, dan platform
            yang diinginkan agar PRD lebih spesifik.
          </p>
          <div className="mt-8 px-6 py-2 rounded-full border border-(--border-subtle) font-inter text-sm font-[510] opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-(--shadow-inset)" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>
            Isi Form Detail
          </div>
        </button>
      </div>
    </div>
  );
}
