"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/types/database";
import type { Plan } from "@/types/database";

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
  plan?: Plan;
}

export function VersionHistory({
  versions,
  currentVersion,
  onSelectVersion,
  className,
  plan = "free",
}: VersionHistoryProps) {
  const [selected, setSelected] = useState(currentVersion);
  const [expanded, setExpanded] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [diffVersions, setDiffVersions] = useState<[PrdVersion, PrdVersion] | null>(null);

  const hasHistoryAccess = FEATURES[plan].versionHistory !== false;

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
    setDiffMode(false);
  };

  const handleDiff = (v1: PrdVersion, v2: PrdVersion) => {
    setDiffVersions([v1, v2]);
    setDiffMode(true);
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
          {hasHistoryAccess ? (
            versions.map((v) => (
              <div key={v.id} className="group">
                <button
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
                {selected === v.version && versions.length > 1 && (
<VersionCompareLinks
                    versions={versions}
                    selectedVersion={v.version}
                    onDiff={handleDiff}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="rounded-lg bg-light-gray-bg p-3 text-center">
              <p className="text-xs text-text-gray">
                Upgrade ke Pro untuk melihat history revisi
              </p>
            </div>
          )}
        </div>
      )}

      {diffMode && diffVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-fustat text-lg font-bold">
                Diff: v{diffVersions[0].version} vs v{diffVersions[1].version}
              </h3>
              <button
                onClick={() => setDiffMode(false)}
                className="text-text-gray hover:text-primary-black"
              >
                Tutup
              </button>
            </div>
            <VersionDiff v1={diffVersions[0]} v2={diffVersions[1]} />
          </div>
        </div>
      )}
    </div>
  );
}

function VersionCompareLinks({
  versions,
  selectedVersion,
  onDiff,
}: {
  versions: PrdVersion[];
  selectedVersion: number;
  onDiff: (v1: PrdVersion, v2: PrdVersion) => void;
}) {
  return (
    <div className="px-3 pb-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-gray">
        Bandingkan dengan
      </p>
      <div className="flex flex-wrap gap-1.5">
        {versions
          .filter((v) => v.version !== selectedVersion)
          .slice(0, 3)
          .map((v) => (
            <button
              key={v.id}
              onClick={() => {
                const currentV = versions.find((vv) => vv.version === selectedVersion);
                if (currentV) onDiff(currentV, v);
              }}
              className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white transition-colors hover:bg-white/20"
            >
              v{v.version}
            </button>
          ))}
      </div>
    </div>
  );
}

export function VersionDiff({ v1, v2 }: { v1: PrdVersion; v2: PrdVersion }) {
  const lines1 = v1.content.split("\n");
  const lines2 = v2.content.split("\n");

  const diff = computeDiff(lines1, lines2);

  return (
    <div className="space-y-0.5 font-mono text-xs">
      {diff.map((part, i) => (
        <div
          key={i}
          className={cn(
            "rounded px-2 py-1",
            part.type === "removed" && "bg-red-50 text-red-700",
            part.type === "added" && "bg-green-50 text-green-700",
            part.type === "unchanged" && "text-text-gray",
          )}
        >
          {part.type === "removed" && "- "}
          {part.type === "added" && "+ "}
          {part.type === "unchanged" && "  "}
          {part.text}
        </div>
      ))}
    </div>
  );
}

function computeDiff(
  oldLines: string[],
  newLines: string[],
): Array<{ text: string; type: "added" | "removed" | "unchanged" }> {
  const result: Array<{ text: string; type: "added" | "removed" | "unchanged" }> = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      result.push({ text: newLine, type: "added" });
    } else if (oldLine !== undefined && newLine === undefined) {
      result.push({ text: oldLine, type: "removed" });
    } else if (oldLine !== newLine) {
      result.push({ text: oldLine, type: "removed" });
      result.push({ text: newLine, type: "added" });
    } else {
      result.push({ text: oldLine, type: "unchanged" });
    }
  }

  return result;
}
