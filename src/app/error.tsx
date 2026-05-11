"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReport = useCallback(async () => {
    await fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message,
        context: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });
    setSent(true);
  }, [error.message]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary-black text-center px-6">
      <div className="text-6xl">😅</div>
      <h1 className="font-fustat text-4xl font-bold text-white">Ups!</h1>
      <p className="max-w-md text-white/60">
        Terjadi kesalahan yang tidak terduga. Tim kami sudah diberitahu.
      </p>

      {process.env.NODE_ENV === "production" && !sent && (
        <button
          onClick={sendReport}
          className="text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          Laporkan masalah ini
        </button>
      )}
      {sent && <span className="text-sm text-green-400">✓ Laporan terkirim</span>}

      {expanded && (
        <div className="max-w-lg rounded-lg bg-white/5 p-4 text-left">
          <p className="font-mono text-xs text-red-400 break-all">{error.message}</p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-white/30">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-white/40 hover:text-white/60 transition-colors"
      >
        {expanded ? "Sembunyikan detail" : "Tampilkan detail teknis"}
      </button>

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