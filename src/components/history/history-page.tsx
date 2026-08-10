"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import { DeleteProjectModal } from "@/components/prd/delete-project-modal";
import { useChatStore, useUIStore } from "@/store";
import { resolveHistoryUrl } from "@/lib/flow-progress";
import { saveSuppressAutoGen } from "@/lib/prompt-handoff";
import { useUserPlan } from "@/hooks/use-user-plan";
import type { HistoryItem } from "@/routes/history";

function isHaltedByCredits(item: HistoryItem): boolean {
  if (item.step === "ac" && item.acStatus === "pending") return true;
  if (item.step === "task" && item.taskStatus === "pending") return true;
  return false;
}

const STEP_BADGE: Record<string, { label: string; className: string }> = {
  question: { label: "Pertanyaan", className: "bg-indigo/15 text-indigo" },
  prd: { label: "PRD", className: "bg-emerald/15 text-emerald" },
  ac: { label: "AC", className: "bg-amber/15 text-amber" },
  task: { label: "Task", className: "bg-violet/15 text-violet" },
};

export function HistoryPage({ items }: { items: HistoryItem[] }) {
  // ponytail: shared TanStack Query hook — deduped across all components.
  const { refetch: refetchPlan } = useUserPlan();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const [localItems, setLocalItems] = useState<HistoryItem[]>(items);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDelete = (id: string) => setDeleteId(id);
  const closeDelete = () => setDeleteId(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    // Optimistic: drop card now so UI feels instant. Restore on failure.
    const snapshot = localItems;
    setLocalItems((prev) => prev.filter((i) => i.id !== deleteId));
    try {
      const res = await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
      // ponytail: 404 = row already gone (idempotent delete). Treat as success
      // so stale History cards (e.g. cross-tab delete) disappear cleanly.
      if (!res.ok && res.status !== 404) throw new Error("Gagal menghapus proyek");
      showToast("Proyek dihapus.", "success");
      closeDelete();
      // Sync with server state (catches any drift, e.g. step changes).
      router.refresh();
    } catch (err) {
      console.error("Delete project failed:", err);
      setLocalItems(snapshot);
      showToast("Gagal menghapus proyek. Coba lagi.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (localItems.length === 0) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-onyx px-6">
        <h1 className="font-inter text-2xl font-[510] text-snow">Riwayat Proyek</h1>
        <p className="mt-2 font-inter text-sm text-fog">
          Belum ada proyek. Mulai dari Home untuk membuat PRD pertama Anda.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="btn-primary mt-6 rounded-md px-5 py-2.5 font-inter text-sm font-[510]"
        >
          Buat Proyek
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-onyx px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="font-inter text-2xl font-[510] text-snow">Riwayat Proyek</h1>
          <p className="mt-1 font-inter text-sm text-fog">
            Lanjutkan dari titik terakhir Anda tinggalkan.
          </p>
        </header>

        <ul className="space-y-3">
          {localItems.map((item) => {
            const badge = STEP_BADGE[item.step ?? "prd"] ?? STEP_BADGE.prd;
            const href = resolveHistoryUrl(item);
            const halted = isHaltedByCredits(item);

            const handleClick = async (e: React.MouseEvent) => {
              if (!halted) return;
              e.preventDefault();
              saveSuppressAutoGen(item.id);

              try {
                // ponytail: use refetchPlan() from shared TanStack Query hook
                // instead of raw fetch("/api/user/plan"). Deduped across components.
                const freshPlan = await refetchPlan();
                const remaining = freshPlan.data?.remaining;
                if (remaining === 0 || (remaining !== "unlimited" && Number(remaining ?? 0) <= 0)) {
                  const stage = item.step === "task" ? "task" : "ac";
                  useChatStore.getState().setCreditsExhausted({
                    stage,
                    message: "Kredit kamu sudah habis. Beli kredit untuk melanjutkan.",
                  });
                }
              } catch {
                // proceed anyway; landing page will handle
              }

              window.location.href = href;
            };

            return (
              <li key={item.id}>
                <a
                  href={href}
                  onClick={handleClick}
                  className="group flex items-center gap-4 rounded-xl border border-graphite bg-charcoal/60 p-4 transition-colors hover:border-fog/40 hover:bg-charcoal"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-inter text-base font-[510] text-snow">
                        {item.name}
                      </h2>
                      <span
                        className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-[510] ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {halted && (
                        <span className="rounded-full px-2 py-0.5 font-inter text-[11px] font-[510] bg-crimson/15 text-crimson">
                          Terhenti
                        </span>
                      )}
                    </div>
                    {item.preview && (
                      <p className="mt-1 line-clamp-2 font-inter text-xs text-fog">
                        {item.preview}
                      </p>
                    )}
                    <p className="mt-1.5 font-inter text-[11px] text-slate">
                      Diperbarui {formatDate(item.updatedAt)}
                    </p>
                  </div>

                  <ArrowRight
                    size={16}
                    className="shrink-0 text-fog opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDelete(item.id);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-crimson transition-colors hover:bg-crimson/10"
                    aria-label={`Hapus proyek ${item.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <DeleteProjectModal
        isOpen={deleteId !== null}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </main>
  );
}

// ponytail: locale formatter. Date comes as ISO/Date from server fn; guard both.
function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
