export default function PrdLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border-subtle border-t-primary-black" />
        <p className="text-sm text-text-gray">Memuat PRD...</p>
      </div>
    </div>
  );
}