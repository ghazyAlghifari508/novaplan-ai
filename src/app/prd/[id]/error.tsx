"use client";

import Link from "next/link";

export default function PrdError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-inter font-[510] text-2xl font-bold">PRD Tidak Ditemukan</h1>
        <p className="mt-2 text-(--text-secondary)">PRD ini mungkin telah dihapus atau tidak tersedia.</p>
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--btn-bg)] px-6 py-3 text-sm font-medium text-[var(--btn-text)] hover:bg-text-gray"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="rounded-lg border border-(--border-subtle) px-6 py-3 text-sm font-medium hover:bg-(--bg-surface)"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}