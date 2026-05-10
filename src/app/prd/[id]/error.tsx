"use client";

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
        <p className="mt-2 text-text-gray">PRD ini mungkin telah dihapus atau tidak tersedia.</p>
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-primary-black px-6 py-3 text-sm font-medium text-white hover:bg-text-gray"
          >
            Coba Lagi
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-border-subtle px-6 py-3 text-sm font-medium hover:bg-light-gray-bg"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}