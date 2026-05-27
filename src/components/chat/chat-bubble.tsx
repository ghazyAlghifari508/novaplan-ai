"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-green/20"
          style={{ color: "var(--text-primary)" }}
        >
          <Sparkles size={16} />
        </div>
      )}

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
          {content}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </p>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--btn-bg)]">
          <span className="text-xs" style={{ color: "var(--btn-text)" }}>U</span>
        </div>
      )}
    </motion.div>
  );
}