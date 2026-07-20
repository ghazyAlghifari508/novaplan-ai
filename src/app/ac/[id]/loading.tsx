export default function AcLoading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-onyx">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo border-t-transparent" />
        <p className="text-fog">Memuat Acceptance Criteria...</p>
      </div>
    </div>
  );
}
