"use client";

import { useState } from "react";
import { PrdViewer } from "./prd-viewer";
import { VersionHistory } from "./version-history";
import { ChatPanel } from "@/components/chat";
import { PrdActions } from "./prd-actions";
import { cn } from "@/lib/utils";
import type { PrdVersion, Plan } from "@/types/database";

interface PrdDetailProps {
  projectId: string;
  projectName: string;
  latestVersion: PrdVersion;
  allVersions: PrdVersion[];
  conversationId?: string;
  isChatOpen?: boolean;
  plan?: Plan;
  revisionLimit?: number;
}

export function PrdDetail({
  projectId,
  projectName,
  latestVersion,
  allVersions,
  conversationId,
  isChatOpen: initialChatOpen = false,
  plan = "free",
  revisionLimit,
}: PrdDetailProps) {
  const [currentContent, setCurrentContent] = useState(latestVersion.content);
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);

  const handleVersionSelect = (content: string) => {
    setCurrentContent(content);
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="font-fustat text-lg font-bold">{projectName}</h1>
            <PrdActions
              projectId={projectId}
              currentName={projectName}
            />
          </div>

          <div className="flex items-center gap-3">
            {revisionLimit !== undefined && (
              <span className="rounded-full bg-light-gray-bg px-3 py-1 text-xs font-medium text-text-gray">
                Revisi: {allVersions.length - 1}/{revisionLimit === -1 ? "∞" : revisionLimit}
              </span>
            )}
            <VersionHistory
              versions={allVersions.map((v) => ({
                id: v.id,
                version: v.version,
                content: v.content,
                change_summary: v.change_summary,
                created_at: v.created_at,
              }))}
              currentVersion={latestVersion.version}
              onSelectVersion={handleVersionSelect}
              plan={plan}
            />

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isChatOpen
                  ? "bg-primary-black text-white"
                  : "bg-light-gray-bg text-text-gray hover:text-primary-black",
              )}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1H2zm12-1a2 2 0 0 1 2 2v11.793a1 1 0 0 1-1.65.759L11.172 11H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z" />
              </svg>
              {isChatOpen ? "Hide Chat" : "Chat"}
            </button>
          </div>
        </div>

        <PrdViewer
          content={currentContent}
          projectName={projectName}
          plan={plan}
        />

        <div className="xl:hidden">
          {isChatOpen && (
            <div className="fixed bottom-0 left-0 right-0 z-40 h-[60vh] rounded-t-2xl border border-border-subtle bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
                <span className="text-sm font-medium">Chat</span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-text-gray hover:text-primary-black"
                >
                  ✕
                </button>
              </div>
              <div className="h-[calc(60vh-44px)]">
                <ChatPanel
                  projectId={projectId}
                  conversationId={conversationId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden xl:block">
        {isChatOpen && (
          <ChatPanel
            projectId={projectId}
            conversationId={conversationId}
            className="w-[380px]"
          />
        )}
      </div>
    </div>
  );
}
