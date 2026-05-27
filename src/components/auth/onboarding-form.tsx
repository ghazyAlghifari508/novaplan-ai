"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

const ROLES = [
  { value: "pm", label: "Product Manager" },
  { value: "developer", label: "Software Developer" },
  { value: "founder", label: "Startup Founder / CTO" },
  { value: "designer", label: "UX/UI Designer" },
  { value: "student", label: "Mahasiswa / Fresh Graduate" },
  { value: "other", label: "Lainnya" },
];

const GOALS = [
  { value: "documentation", label: "Dokumentasi produk" },
  { value: "team_blueprint", label: "Blueprint tim development" },
  { value: "pitching", label: "Pitching ke investor / stakeholder" },
  { value: "learning", label: "Belajar membuat PRD" },
  { value: "rapid_shipping", label: "Rapid product shipping" },
];

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [tujuan, setTujuan] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const toggleTujuan = (value: string) => {
    setTujuan((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !fullName.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    if (step === 2 && !role) {
      setError("Pilih peran kamu");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (tujuan.length === 0) {
      setError("Pilih minimal satu tujuan");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }

    await supabase
      .from("users")
      .update({
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    setUser({ id: data.user.id, email: data.user.email! });
    router.push("/");
  };

  return (
    <div className="w-full max-w-lg space-y-8">
      <div className="text-center">
        <h1 className="font-fustat text-3xl font-bold">
          {step === 1 && "Siapa nama kamu?"}
          {step === 2 && "Apa peran kamu?"}
          {step === 3 && "Apa tujuan kamu?"}
        </h1>
        <p className="mt-2 text-text-gray dark:text-[#A0A0A0]">
          {step === 1 && "Kami akan menyapa kamu dengan nama ini"}
          {step === 2 && "Supaya kami bisa menyesuaikan pengalaman"}
          {step === 3 && "Bisa pilih lebih dari satu"}
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Input
            placeholder="Nama lengkap kamu"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            autoFocus
          />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                setRole(r.value);
                setError(null);
              }}
              className={`rounded-lg border p-4 text-left transition-all ${
                role === r.value
                  ? "border-primary-black btn-primary"
                  : "border-border-subtle dark:border-white/10 hover:border-primary-black/30"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => toggleTujuan(g.value)}
              className={`rounded-lg border p-4 text-left transition-all ${
                tujuan.includes(g.value)
                  ? "border-primary-black btn-primary"
                  : "border-border-subtle dark:border-white/10 hover:border-primary-black/30"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? "bg-[var(--btn-bg)]" : "bg-light-gray-bg dark:bg-[#161616]"
              }`}
            />
          ))}
        </div>
        {step < 3 ? (
          <Button onClick={handleNext}>Lanjut</Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={loading}>
            Selesai
          </Button>
        )}
      </div>
    </div>
  );
}
