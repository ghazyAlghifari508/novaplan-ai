"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PrdVersion {
  id: string;
  version: number;
  content: string;
  change_summary: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  versions: PrdVersion[];
  currentVersion: number;
  onSelectVersion: (content: string) => void;
  className?: string;
}

export function VersionHistory({
  versions,
  currentVersion,
  onSelectVersion,
  className,
}: VersionHistoryProps) {
  const [selected, setSelected] = useState(currentVersion);
  const [expanded, setExpanded] = useState(false);

  if (versions.length <= 1) {
    return (
      <div className={cn("p-4", className)}>
        <p className="text-xs text-text-gray">Belum ada revisi</p>
      </div>
    );
  }

  const handleSelect = (version: PrdVersion) => {
    setSelected(version.version);
    onSelectVersion(version.content);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex w-full items-center justify-between text-sm font-medium text-text-gray hover:text-primary-black"
      >
        <span>Version History ({versions.length})</span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 4l4 4-4 4"
          />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-1">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelect(v)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selected === v.version
                  ? "bg-primary-black text-white"
                  : "hover:bg-light-gray-bg text-text-gray",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">v{v.version}</span>
                <span className="text-xs opacity-60">
                  {new Date(v.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              {v.change_summary && (
                <p className="mt-0.5 text-xs opacity-70 truncate">
                  {v.change_summary}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}