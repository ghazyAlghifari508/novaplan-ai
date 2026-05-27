export default function PrdLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border-subtle dark:border-white/10 border-t-primary-black" />
        <p className="text-sm text-text-gray dark:text-[#A0A0A0]">Memuat PRD...</p>
      </div>
    </div>
  );
}