"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-black text-center">
      <h1 className="font-fustat text-4xl font-bold text-white">Ups!</h1>
      <p className="max-w-md text-white/60">
        Terjadi kesalahan saat memuat halaman. Coba refresh atau kembali ke
        beranda.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}