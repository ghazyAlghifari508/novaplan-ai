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
        <h1 className="font-fustat text-2xl font-bold">PRD Tidak Ditemukan</h1>
        <p className="mt-2 text-text-gray dark:text-[#A0A0A0]">PRD ini mungkin telah dihapus atau tidak tersedia.</p>
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--btn-bg)] px-6 py-3 text-sm font-medium text-[var(--btn-text)] hover:bg-text-gray"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border-subtle dark:border-white/10 px-6 py-3 text-sm font-medium hover:bg-light-gray-bg dark:bg-[#161616]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}