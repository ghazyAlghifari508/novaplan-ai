"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renamePrd, deletePrd, duplicatePrd } from "@/app/actions/prd";
import { cn } from "@/lib/utils";

interface PrdActionsProps {
  projectId: string;
  currentName: string;
  className?: string;
}

export function PrdActions({
  projectId,
  currentName,
  className,
}: PrdActionsProps) {
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={() => {
          setShowRename(!showRename);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-gray dark:text-[#A0A0A0] transition-colors hover:bg-light-gray-bg dark:bg-[#161616]"
      >
        Rename
      </button>

      <form action={duplicatePrd.bind(null, projectId)}>
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-gray dark:text-[#A0A0A0] transition-colors hover:bg-light-gray-bg dark:bg-[#161616]"
        >
          Duplicate
        </button>
      </form>

      <button
        onClick={() => setShowDelete(true)}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
      >
        Delete
      </button>

      {showRename && (
        <form
          action={async (fd) => {
            await renamePrd(projectId, fd);
            setShowRename(false);
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-48 text-xs"
          />
          <Button type="submit" size="sm" className="h-8 text-xs">
            Save
          </Button>
          <button
            type="button"
            onClick={() => setShowRename(false)}
            className="text-xs text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:text-[#F0F0F0]"
          >
            Cancel
          </button>
        </form>
      )}

      {showDelete && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <span className="text-xs text-red-700">Hapus PRD ini?</span>
          <form action={deletePrd.bind(null, projectId)}>
            <button
              type="submit"
              className="rounded bg-red-600 px-2 py-0.5 text-xs text-white transition-colors hover:bg-red-700"
            >
              Ya
            </button>
          </form>
          <button
            onClick={() => setShowDelete(false)}
            className="text-xs text-text-gray dark:text-[#A0A0A0] hover:text-primary-black dark:text-[#F0F0F0]"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}