"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMeta {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

interface ProjectSidebarProps {
  projects: ProjectMeta[];
  currentProjectId?: string;
  isDeletingId: string | null;
  renamingId: string | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onRenameSubmit: (e: React.FormEvent | React.FocusEvent | React.KeyboardEvent, id: string) => void;
  onRenameCancel: () => void;
  onContextMenu: (e: React.MouseEvent, id: string, name: string) => void;
  onDeleteRequest: (e: React.MouseEvent, id: string) => void;
  /** For mobile: close the overlay after navigating */
  onNavigate?: () => void;
}

/**
 * Shared project sidebar content, used for both desktop and mobile views.
 * Eliminates the ~200 lines of duplicated sidebar JSX in prd-detail.tsx.
 */
export function ProjectSidebarContent({
  projects,
  currentProjectId,
  isDeletingId,
  renamingId,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  onContextMenu,
  onDeleteRequest,
  onNavigate,
}: ProjectSidebarProps) {
  if (projects.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-fog">
        Belum ada proyek.
      </div>
    );
  }

  return (
    <>
      {projects.map((p) => (
        <div
          key={p.id}
          onContextMenu={(e) => onContextMenu(e, p.id, p.name)}
          className={cn(
            "group flex items-center justify-between w-full rounded-lg transition-colors relative",
            currentProjectId === p.id
              ? "bg-obsidian font-[510] text-snow shadow-[var(--shadow-inset)]"
              : "text-fog hover:bg-white/5 hover:text-snow",
          )}
        >
          {renamingId === p.id ? (
            <form onSubmit={(e) => onRenameSubmit(e, p.id)} className="flex-1 px-2 py-1.5 flex items-center">
              <input
                autoFocus
                className="w-full rounded bg-steel px-2 py-1 font-inter text-sm text-snow shadow-[inset_0_0_0_1px_rgba(94,106,210,0.85)] focus:outline-none"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    await onRenameSubmit(e, p.id);
                  } else if (e.key === "Escape") {
                    onRenameCancel();
                  }
                }}
                onBlur={(e) => onRenameSubmit(e, p.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </form>
          ) : (
            <>
              <Link
                href={`/prd/${p.id}`}
                onClick={onNavigate}
                className="block flex-1 truncate px-3 py-2.5 font-inter text-sm"
              >
                {p.name}
              </Link>
              <button
                onClick={(e) => onDeleteRequest(e, p.id)}
                disabled={isDeletingId === p.id}
                className="mr-2 flex-shrink-0 rounded-md p-1.5 text-crimson opacity-0 transition-opacity hover:bg-crimson/10 group-hover:opacity-100 disabled:opacity-50"
                title="Hapus proyek"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ))}
    </>
  );
}
