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
      className="fixed z-50 w-40 rounded-xl bg-obsidian py-1 font-inter shadow-[var(--shadow-overlay)]"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-mist transition-colors hover:bg-white/5 hover:text-snow"
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
          className="w-full px-3 py-1.5 text-left text-sm text-mist transition-colors hover:bg-white/5 hover:text-snow"
        >
          Duplicate
        </button>
      </form>
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-crimson transition-colors hover:bg-crimson/10"
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
