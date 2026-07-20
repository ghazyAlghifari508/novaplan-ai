"use client";

export default function TaskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-dvh items-center justify-center bg-onyx text-snow">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-[510]">Gagal Memuat Task Board</h2>
        <p className="mb-4 text-fog">{error.message || "Terjadi kesalahan"}</p>
        <button type="button" onClick={reset} className="btn-primary rounded-md px-4 py-2">
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
