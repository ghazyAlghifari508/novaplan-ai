"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password berhasil diubah!");
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="font-fustat text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-text-gray dark:text-[#A0A0A0]">Masukkan password baru kamu</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="new-password"
            className="text-sm font-medium text-primary-black dark:text-[#F0F0F0]"
          >
            Password Baru
          </label>
          <Input
            id="new-password"
            type="password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm"
            className="text-sm font-medium text-primary-black dark:text-[#F0F0F0]"
          >
            Konfirmasi Password
          </label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={loading}>
          Simpan Password Baru
        </Button>
      </form>
    </div>
  );
}