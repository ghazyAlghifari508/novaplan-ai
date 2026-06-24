export default function SettingsLoading() {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6 min-h-[400px] animate-pulse">
      <div className="h-8 w-1/3 bg-black/10 dark:bg-white/10 rounded-md mb-8"></div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-1/4 bg-black/10 dark:bg-white/10 rounded"></div>
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded-lg"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-1/4 bg-black/10 dark:bg-white/10 rounded"></div>
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded-lg"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-1/4 bg-black/10 dark:bg-white/10 rounded"></div>
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
