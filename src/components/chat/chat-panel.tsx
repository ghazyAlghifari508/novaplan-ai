"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatStore } from "@/store";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { GenerationProgress } from "./generation-progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

interface ChatPanelProps {
  projectId?: string;
  conversationId?: string;
  className?: string;
  onProjectCreated?: (projectId: string) => void;
}

// Shared variable outside component to prevent multiple instances from auto-submitting
let lastAutoSubmitTime = 0;

export function ChatPanel({
  projectId,
  conversationId: initialConversationId,
  className,
  onProjectCreated,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [streamingContent, setStreamingContent] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitErrorMsg, setLimitErrorMsg] = useState("");

  // Close limit modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLimitModal(false);
    };
    if (showLimitModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLimitModal]);

  const {
    messages,
    isStreaming,
    isGeneratingPRD,
    addMessage,
    setStreaming,
    setGeneratingPRD,
    setStreamingPRDContent,
  } = useChatStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Auto-submit prompt from URL if present
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    const mode = searchParams.get("mode");
    if (prompt && !isStreaming && messages.length === 0) {
      // Prevent multiple instances (desktop/mobile) and StrictMode from firing simultaneously
      const now = Date.now();
      if (now - lastAutoSubmitTime < 1000) return;
      lastAutoSubmitTime = now;

      // Clear prompt from URL immediately to avoid re-triggering
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      url.searchParams.delete("mode");
      router.replace(url.pathname + url.search);
      
      if (mode === "auto") {
        setGeneratingPRD(true);
        const autoMessage = `Generate PRD lengkap berdasarkan informasi berikut:\n\n${prompt}\n\nGunakan section markers sesuai standar.`;
        handleSendWithMessage(autoMessage, "generate", prompt);
      } else {
        // Auto-send the prompt
        handleSendWithMessage(prompt, "chat");
      }
    }
  }, [searchParams, router, isStreaming, messages.length]);

  const isSubmittingRef = useRef(false);

  // Sync ref with isStreaming state to ensure we can send again when streaming finishes
  useEffect(() => {
    if (!isStreaming) {
      isSubmittingRef.current = false;
    }
  }, [isStreaming]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const messageId = crypto.randomUUID();

    addMessage({
      id: messageId,
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

    let fullContent = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        setStreaming(false);
        isSubmittingRef.current = false;
        
        if (response.status === 403 || response.status === 429) {
          setLimitErrorMsg(err.error || "Limit tercapai");
          setShowLimitModal(true);
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: err.error || "Terjadi kesalahan",
            timestamp: Date.now(),
          });
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              if (parsed.projectId && onProjectCreated && !projectId) {
                onProjectCreated(parsed.projectId);
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
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
      });
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Terjadi kesalahan koneksi.",
        timestamp: Date.now(),
      });
    } finally {
      setStreaming(false);
      setStreamingContent("");
      isSubmittingRef.current = false;
    }
  };

  const handleSendWithMessage = async (
    msg: string,
    chatMode: "chat" | "generate" | "revise" = "chat",
    displayMessage?: string | null
  ) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (displayMessage !== null) {
      addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: displayMessage || msg,
        timestamp: Date.now(),
      });
    }

    setStreaming(true);
    setStreamingContent("");

    const body: Record<string, unknown> = {
      message: msg,
      mode: chatMode,
    };

    if (conversationId) body.conversationId = conversationId;
    if (projectId) body.projectId = projectId;

    let fullContent = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        setStreaming(false);
        setGeneratingPRD(false);
        isSubmittingRef.current = false;

        if (response.status === 403 || response.status === 429) {
          setLimitErrorMsg(err.error || "Limit tercapai");
          setShowLimitModal(true);
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: err.error || "Terjadi kesalahan",
            timestamp: Date.now(),
          });
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              if (chatMode === "generate" || chatMode === "revise") {
                setStreamingPRDContent(fullContent);
              } else {
                setStreamingContent(fullContent);
              }
            } else if (parsed.type === "done") {
              if (parsed.conversationId) {
                setConversationId(parsed.conversationId);
              }
              if (parsed.projectId && onProjectCreated && !projectId) {
                onProjectCreated(parsed.projectId);
              }
            } else if (parsed.type === "error") {
              fullContent = "";
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Gagal generate PRD: ${parsed.error || "Terjadi kesalahan pada AI model."}`,
                timestamp: Date.now(),
              });
              setGeneratingPRD(false);
              setStreamingPRDContent("");
              return;
            }
          } catch {
            continue;
          }
        }
      }

      if (chatMode === "generate" || chatMode === "revise") {
        if (fullContent.trim()) {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Selesai menyusun PRD.",
            timestamp: Date.now(),
          });
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Gagal menyusun PRD. AI tidak menghasilkan konten. Silakan coba lagi.",
            timestamp: Date.now(),
          });
          setGeneratingPRD(false);
          setStreamingPRDContent("");
        }
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullContent,
          timestamp: Date.now(),
        });
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Terjadi kesalahan koneksi.",
        timestamp: Date.now(),
      });
    } finally {
      setStreaming(false);
      setStreamingContent("");
      // Don't clear PRD streaming state here for generate/revise modes.
      // The content must stay visible until the page navigates to /prd/[id].
      // It will be cleared when the new page mounts and the component unmounts.
      if (chatMode !== "generate" && chatMode !== "revise") {
        setStreamingPRDContent("");
        setGeneratingPRD(false);
      }
      isSubmittingRef.current = false;
    }
  };

  return (
    <div
      className={cn("flex h-full flex-col border-l border-[var(--border-subtle)]", className)}
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent-green" />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>NovaPlan AI</span>
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
      </div>

      <div className="border-t border-[var(--border-subtle)] p-4">
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
            className="flex-1 resize-none rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--border-medium)]"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-black transition-all hover:opacity-80 disabled:opacity-30 dark:bg-white"
            style={{ color: "white" }}
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

      {/* Limit Modal Overlay */}
      {showLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowLimitModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertCircle size={24} strokeWidth={2} />
                </div>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="text-text-gray hover:text-primary-black transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="font-fustat text-xl font-bold text-primary-black mb-2 mt-2">
                Limit Tercapai
              </h3>
              <p className="font-schibsted text-text-gray text-sm mb-6 leading-relaxed">
                {limitErrorMsg}
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/pricing"
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-3 px-4 bg-primary-black text-center font-schibsted font-bold text-sm rounded-lg hover:opacity-90 transition-opacity"
                  style={{ color: "white" }}
                >
                  🚀 Upgrade ke Hengker
                </Link>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-3 px-4 bg-light-gray-bg text-primary-black text-center font-schibsted font-medium text-sm rounded-lg hover:bg-border-subtle transition-colors"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}