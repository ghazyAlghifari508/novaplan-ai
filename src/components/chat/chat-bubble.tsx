"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function cleanMessage(content: string): string {
  // Filter out the raw :::UPDATE_SECTION[...]::: blocks and their content 
  // so they are not rendered in the chat bubble UI from historical messages.
  let cleaned = content.replace(/:::UPDATE_SECTION\[(.*?)\]:::\s*([\s\S]*?)(?::::END_UPDATE:::|$)/g, "").trim();
  if (!cleaned && content.includes(":::UPDATE_SECTION")) {
    return "Telah merevisi dokumen PRD.";
  }
  return cleaned || content;
}

interface ChatBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function ChatBubble({
  role,
  content,
  isStreaming,
  className,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start", className)}
    >

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-[var(--btn-bg)] rounded-br-md"
            : "rounded-bl-md",
        )}
        style={
          isUser
            ? { color: "var(--btn-text)" }
            : { background: "var(--bg-surface)", color: "var(--text-primary)" }
        }
      >
        <p className="whitespace-pre-wrap">
          {!isUser ? cleanMessage(content) : content}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </p>
      </div>
    </motion.div>
  );
}