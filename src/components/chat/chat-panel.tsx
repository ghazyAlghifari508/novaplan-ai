"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { ModeSelector } from "./mode-selector";
import { PreferenceForm } from "./preference-form";
import { GenerationProgress } from "./generation-progress";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  projectId?: string;
  conversationId?: string;
  className?: string;
}

export function ChatPanel({
  projectId,
  conversationId: initialConversationId,
  className,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [streamingContent, setStreamingContent] = useState("");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showPreferenceForm, setShowPreferenceForm] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    isGeneratingPRD,
    addMessage,
    setStreaming,
    setGeneratingPRD,
  } = useChatStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    });

    setInput("");
    setStreaming(true);
    setStreamingContent("");

    const body: Record<string, unknown> = {
      message: trimmed,
      mode: "chat",
    };

    if (conversationId) body.conversationId = conversationId;
    if (projectId) body.projectId = projectId;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      setStreaming(false);
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: err.error || "Terjadi kesalahan",
        timestamp: Date.now(),
      });
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "delta") {
            fullContent += parsed.content;
            setStreamingContent(fullContent);
          } else if (parsed.type === "done") {
            if (parsed.conversationId) {
              setConversationId(parsed.conversationId);
            }
          } else if (parsed.type === "error") {
            fullContent = parsed.error;
          }
        } catch {
          continue;
        }
      }
    }

    addMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: fullContent,
      timestamp: Date.now(),
    });

    setStreaming(false);
    setStreamingContent("");

    if (
      fullContent.includes("🤖 Biarkan AI Memilih") ||
      fullContent.includes("✏️ Pilih Sendiri")
    ) {
      setShowModeSelector(true);
    }
  };

  const handleModeSelect = (selectedMode: "ai_auto" | "manual") => {
    setShowModeSelector(false);

    if (selectedMode === "ai_auto") {
      setGeneratingPRD(true);

      const autoMessage =
        "Generate PRD lengkap untuk produk ini. Gunakan section markers.";
      handleSendWithMessage(autoMessage, "generate");
    } else {
      setShowPreferenceForm(true);
    }
  };

  const handlePreferencesSubmit = (preferences: Record<string, unknown>) => {
    setShowPreferenceForm(false);
    setGeneratingPRD(true);

    const prefMessage = `Generate PRD dengan preferensi berikut: ${JSON.stringify(preferences)}. Gunakan section markers.`;
    handleSendWithMessage(prefMessage, "generate");
  };

  const handleSendWithMessage = async (
    msg: string,
    chatMode: "chat" | "generate" | "revise" = "chat",
  ) => {
    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: Date.now(),
    });

    setStreaming(true);
    setStreamingContent("");

    const body: Record<string, unknown> = {
      message: msg,
      mode: chatMode,
    };

    if (conversationId) body.conversationId = conversationId;
    if (projectId) body.projectId = projectId;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      setStreaming(false);
      setGeneratingPRD(false);
      addMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: err.error || "Terjadi kesalahan",
        timestamp: Date.now(),
      });
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "delta") {
            fullContent += parsed.content;
            setStreamingContent(fullContent);
          } else if (parsed.type === "done") {
            if (parsed.conversationId) {
              setConversationId(parsed.conversationId);
            }
          }
        } catch {
          continue;
        }
      }
    }

    addMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: fullContent,
      timestamp: Date.now(),
    });

    setStreaming(false);
    setStreamingContent("");
    setGeneratingPRD(false);
  };

  return (
    <div
      className={cn("flex h-full flex-col border-l border-border-subtle", className)}
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent-green" />
          <span className="text-sm font-medium">NovaPlan AI</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
          />
        ))}

        {isStreaming && streamingContent && (
          <ChatBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        {isStreaming && !streamingContent && <TypingIndicator />}

        <GenerationProgress isActive={isGeneratingPRD} />

        {showModeSelector && <ModeSelector onSelect={handleModeSelect} />}

        {showPreferenceForm && (
          <PreferenceForm onSubmit={handlePreferencesSubmit} />
        )}
      </div>

      <div className="border-t border-border-subtle p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesan atau revisi PRD..."
            className="flex-1 resize-none rounded-lg border border-border-subtle bg-light-gray-bg px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-black/20 focus:bg-white"
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-black text-white transition-all hover:bg-text-gray disabled:opacity-30"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M2 8L14 8M10 4L14 8L10 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}