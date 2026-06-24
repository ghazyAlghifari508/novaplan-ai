"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insforge } from "@/lib/insforge/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

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

    if (!token) {
      setError("Token reset tidak ditemukan. Silakan minta link reset baru.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await insforge.auth.resetPassword({
      newPassword: password,
      otp: token,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password berhasil diubah!");
    setTimeout(() => router.push("/login"), 2000);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="font-inter font-[510] text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-(--text-secondary)">Masukkan password baru kamu</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="new-password"
            className="text-sm font-medium text-(--text-primary)"
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
            className="text-sm font-medium text-(--text-primary)"
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