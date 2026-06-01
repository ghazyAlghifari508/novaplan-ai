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
      <div className="p-4 text-center text-xs text-text-gray dark:text-[#A0A0A0]">
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
              ? "bg-black/5 font-medium text-primary-black dark:text-[#F0F0F0]"
              : "text-text-gray dark:text-[#A0A0A0] hover:bg-black/5 hover:text-primary-black dark:text-[#F0F0F0]",
          )}
        >
          {renamingId === p.id ? (
            <form onSubmit={(e) => onRenameSubmit(e, p.id)} className="flex-1 px-2 py-1.5 flex items-center">
              <input
                autoFocus
                className="w-full text-sm font-schibsted bg-white dark:bg-[#2A2A2A] border border-blue-500 rounded px-2 py-1 focus:outline-none"
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
                className="flex-1 block px-3 py-2.5 text-sm truncate font-schibsted"
              >
                {p.name}
              </Link>
              <button
                onClick={(e) => onDeleteRequest(e, p.id)}
                disabled={isDeletingId === p.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mr-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md disabled:opacity-50 flex-shrink-0"
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
