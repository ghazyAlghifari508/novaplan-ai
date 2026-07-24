export default function KanbanLoading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-onyx" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo border-t-transparent" />
        <p className="text-fog">Memuat Kanban Board...</p>
      </div>
    </div>
  );
}
