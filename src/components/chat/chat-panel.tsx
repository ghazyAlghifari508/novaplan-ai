"use client";

import { useState, useRef, useEffect, useCallback, startTransition } from "react";
import { useChatStore, useUIStore } from "@/store";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { ModelDropdown } from "./model-dropdown";
import { LimitModal } from "./limit-modal";
import { cn } from "@/lib/utils";
import { consumePendingPrdPrompt } from "@/lib/prompt-handoff";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { ALL_MODELS, DEFAULT_MODEL_ID } from "@/lib/model-config";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MIN_PROMPT_LENGTH = 20;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ChatPanelProps {
  projectId?: string;
  conversationId?: string;
  className?: string;
  onProjectCreated?: (projectId: string) => void;
  enableAutoSubmit?: boolean;
  inputDisabled?: boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ChatPanel({
  projectId,
  conversationId: initialConversationId,
  className,
  onProjectCreated,
  enableAutoSubmit = true,
  inputDisabled = false,
}: ChatPanelProps) {
  // ── Local State ──
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [streamingContent, setStreamingContent] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitErrorMsg, setLimitErrorMsg] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [userPlan, setUserPlan] = useState<Plan>("free");

  // ── Refs ──
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Store ──
  const showToast = useUIStore((s) => s.showToast);
  const router = useRouter();
  const {
    messages,
    isStreaming,
    addMessage,
    setStreaming,
    setGeneratingPRD,
    setStreamingPRDContent,
  } = useChatStore();

  // ── Derived ──
  const isEffectivelyDisabled = inputDisabled && messages.length === 0;

  // ── Effects ──

  // Restore model from session + fetch user plan
  useEffect(() => {
    const storedModel = sessionStorage.getItem("novaplan:selected-model");
    if (storedModel && ALL_MODELS.some((m) => m.id === storedModel)) {
      setSelectedModel(storedModel);
    }
    const fetchStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
      if (sub) setUserPlan(sub.plan as Plan);
    };
    fetchStatus();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Sync isSubmitting with streaming state
  useEffect(() => {
    if (!isStreaming) {
      isSubmittingRef.current = false;
    }
  }, [isStreaming]);

  // ── Handlers ──

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreaming(false);
    isSubmittingRef.current = false;
  }, [setStreaming]);

  /**
   * Stream an API call to /api/chat and handle SSE events.
   * Shared between handleSend (user-typed) and handleSendWithMessage (auto-submit).
   */
  const streamApiCall = useCallback(
    async (
      body: Record<string, unknown>,
      chatMode: string,
      /** The original user message, used to restore input on error */
      originalMessage: string,
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let fullContent = "";
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortController.signal,
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
            showToast(err.error || "Terjadi kesalahan", "error");
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
                const errorMsg = parsed.error ||
                  (chatMode === "generate" || chatMode === "revise"
                    ? "Gagal menyusun PRD. Silakan coba lagi."
                    : "Gagal memproses pesan. Silakan coba lagi.");

                showToast(errorMsg, "error");
                addMessage({
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: `❌ **Pengiriman Gagal**\n\n${errorMsg}\n\n*Pesan kamu telah dikembalikan ke kotak input. Silakan coba kirim ulang.*`,
                  timestamp: Date.now(),
                });

                setGeneratingPRD(false);
                setInput(originalMessage);
                return;
              }
            } catch {
              continue;
            }
          }
        }

        // ── Post-stream: add final message ──
        if (chatMode === "generate" || chatMode === "revise") {
          if (fullContent.trim()) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Selesai menyusun PRD.",
              timestamp: Date.now(),
            });
            if (chatMode === "revise") {
              startTransition(() => { router.refresh(); });
            }
          } else {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Gagal menyusun PRD. AI tidak menghasilkan konten. Silakan coba lagi.",
              timestamp: Date.now(),
            });
            setGeneratingPRD(false);
          }
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          showToast("Proses dihentikan.", "info");
        } else {
          showToast("Terjadi kesalahan koneksi.", "error");
        }
      } finally {
        setStreaming(false);
        setStreamingContent("");
        setGeneratingPRD(false);
        if (chatMode !== "generate" && chatMode !== "revise") {
          setStreamingPRDContent("");
        }
        isSubmittingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [addMessage, onProjectCreated, projectId, setGeneratingPRD, setStreaming, setStreamingPRDContent, showToast, router],
  );

  /** Called when the user types a message and clicks send. */
  const handleSend = async (overrideMode?: "chat" | "revise") => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isSubmittingRef.current) return;

    const resolvedMode = overrideMode || (projectId ? "revise" : "generate");

    if (resolvedMode === "generate" && trimmed.length < MIN_PROMPT_LENGTH) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Deskripsikan produkmu lebih detail (minimal ${MIN_PROMPT_LENGTH} karakter) agar saya bisa menghasilkan PRD yang berkualitas. Contoh: *"Buatkan PRD untuk aplikasi e-commerce fashion yang mendukung payment gateway dan tracking pengiriman."*`,
        timestamp: Date.now(),
      });
      setInput("");
      return;
    }

    isSubmittingRef.current = true;
    addMessage({ id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: Date.now() });
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setStreamingPRDContent("");

    const body: Record<string, unknown> = { message: trimmed, mode: resolvedMode, preferences: {} };

    if (typeof window !== "undefined") {
      const model = sessionStorage.getItem("novaplan:selected-model");
      if (model) body.preferences = { model };
    }
    if (conversationId) body.conversationId = conversationId;
    if (projectId) body.projectId = projectId;
    if (resolvedMode === "generate" || resolvedMode === "revise") setGeneratingPRD(true);

    await streamApiCall(body, resolvedMode, trimmed);
  };

  /**
   * Called programmatically (e.g. auto-submit from /setup).
   * Differs from handleSend: it receives the message as a parameter.
   */
  const handleSendWithMessage = useCallback(
    async (msg: string, chatMode: "chat" | "generate" | "revise", displayMessage?: string | null) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      if (displayMessage !== null) {
        addMessage({ id: crypto.randomUUID(), role: "user", content: displayMessage || msg, timestamp: Date.now() });
      }

      setStreaming(true);
      setStreamingContent("");
      setStreamingPRDContent("");
      if (chatMode === "generate" || chatMode === "revise") setGeneratingPRD(true);

      const body: Record<string, unknown> = { message: msg, mode: chatMode };
      if (conversationId) body.conversationId = conversationId;
      if (projectId) body.projectId = projectId;

      await streamApiCall(body, chatMode, msg);
    },
    [addMessage, conversationId, projectId, setGeneratingPRD, setStreaming, streamApiCall],
  );

  // ── Auto-submit from /setup page ──
  useEffect(() => {
    if (!enableAutoSubmit || isStreaming || messages.length > 0 || autoSubmitAttemptedRef.current) return;

    const pending = consumePendingPrdPrompt();
    if (!pending) return;

    autoSubmitAttemptedRef.current = true;

    if (pending.mode === "auto") {
      setGeneratingPRD(true);
      const autoMessage = `Generate PRD lengkap berdasarkan informasi berikut:\n\n${pending.prompt}\n\nGunakan section markers sesuai standar.`;
      void handleSendWithMessage(autoMessage, "generate", pending.prompt);
    } else {
      void handleSendWithMessage(pending.prompt, "chat");
    }
  }, [enableAutoSubmit, handleSendWithMessage, isStreaming, messages.length, setGeneratingPRD]);

  // ── Render ──

  return (
    <div
      className={cn("flex h-full flex-col border-l border-[var(--border-subtle)]", className)}
      style={{ background: "var(--bg-elevated)" }}
    >
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent-green" />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>NovaPlan AI</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isStreaming && streamingContent && (
          <ChatBubble role="assistant" content={streamingContent} isStreaming />
        )}
        {isStreaming && !streamingContent && <TypingIndicator />}
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border-subtle)] p-4">
        <div
          className="flex flex-col rounded-[12px] shadow-sm border border-[var(--border-subtle)] relative focus-within:border-[var(--border-medium)] transition-colors"
          style={{ background: "var(--bg-elevated)" }}
        >
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
            placeholder={isEffectivelyDisabled ? "Pilih proyek dari daftar atau buat baru dari beranda" : projectId ? "Ketik pesan atau instruksi revisi PRD..." : "Ceritakan ide produkmu..."}
            className={cn(
              "w-full resize-none border-none bg-transparent font-schibsted text-[14px] outline-none px-3 pt-3 pb-2",
              isEffectivelyDisabled && "cursor-not-allowed opacity-70"
            )}
            style={{ color: "var(--text-primary)", caretColor: "var(--text-primary)" }}
            rows={2}
            disabled={isStreaming || isEffectivelyDisabled}
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <ModelDropdown
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              userPlan={userPlan}
              isDisabled={isEffectivelyDisabled}
              isStreaming={isStreaming}
            />

            <button
              onClick={isStreaming ? handleCancel : () => handleSend()}
              disabled={!isStreaming && (!input.trim() || isSubmittingRef.current || isEffectivelyDisabled)}
              className={cn(
                "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30",
                isStreaming ? "bg-red-500 hover:bg-red-600 text-white" : "btn-primary hover:opacity-80"
              )}
              title={isStreaming ? "Hentikan Proses" : (projectId ? "Update PRD" : "Generate PRD")}
            >
              {isStreaming ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8L14 8M10 4L14 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Limit Modal */}
      <LimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        errorMessage={limitErrorMsg}
      />
    </div>
  );
}
