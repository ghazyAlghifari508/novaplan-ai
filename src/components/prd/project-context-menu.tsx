"use client";

import { duplicatePrd } from "@/app/actions/prd";

interface ProjectContextMenuProps {
  contextMenu: { id: string; name: string; x: number; y: number } | null;
  onRename: (id: string, currentName: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onClose: () => void;
}

/**
 * Context menu (right-click) for project items.
 * Extracted from prd-detail.tsx.
 */
export function ProjectContextMenu({ contextMenu, onRename, onDelete, onClose }: ProjectContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-[100] bg-white dark:bg-[#1E1E1E] border border-border-subtle dark:border-white/10 rounded-lg shadow-xl w-40 py-1 font-schibsted"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-3 py-1.5 text-sm text-primary-black dark:text-[#F0F0F0] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => {
          onRename(contextMenu.id, contextMenu.name);
          onClose();
        }}
      >
        Rename
      </button>
      <form action={duplicatePrd.bind(null, contextMenu.id)}>
        <button
          type="submit"
          className="w-full text-left px-3 py-1.5 text-sm text-primary-black dark:text-[#F0F0F0] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          Duplicate
        </button>
      </form>
      <button
        className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        onClick={(e) => {
          onClose();
          onDelete(e, contextMenu.id);
        }}
      >
        Delete
      </button>
    </div>
  );
}
