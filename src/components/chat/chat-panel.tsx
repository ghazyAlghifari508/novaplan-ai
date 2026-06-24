"use client";

import { useState, useRef, useEffect, useCallback, startTransition } from "react";
import { useChatStore, useUIStore } from "@/store";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { ModelDropdown } from "./model-dropdown";
import { LimitModal } from "./limit-modal";
import { ResumeErrorModal } from "./resume-error-modal";
import { cn } from "@/lib/utils";
import { consumePendingPrdPrompt } from "@/lib/prompt-handoff";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types/database";
import { ALL_MODELS, DEFAULT_MODEL_ID } from "@/lib/model-config";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function livePatchPrd(baseContent: string, streamContent: string): string {
  if (!baseContent) return streamContent;

  let patched = baseContent;
  const regex = /:::UPDATE_SECTION\[(.*?)\]:::\s*([\s\S]*?)(?::::END_UPDATE:::|$)/g;
  let match;
  
  // Karena regex global memiliki state lastIndex, kita bisa loop aman
  while ((match = regex.exec(streamContent)) !== null) {
    const sectionName = match[1].trim();
    const newContent = match[2].trim();
    
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`<!-- SECTION: ${escaped} -->[\\s\\S]*?<!-- \\/SECTION -->`, 'gi');
    
    if (sectionRegex.test(patched)) {
      patched = patched.replace(sectionRegex, `<!-- SECTION: ${sectionName} -->\n${newContent}\n<!-- /SECTION -->`);
    }
  }
  return patched;
}

function cleanChatBubble(streamContent: string): string {
  let cleaned = streamContent.replace(/:::UPDATE_SECTION\[(.*?)\]:::\s*([\s\S]*?)(?::::END_UPDATE:::|$)/g, "").trim();
  if (!cleaned) return "Menerapkan revisi ke dokumen...";
  return cleaned;
}
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
  currentPrdContent?: string;
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
  currentPrdContent = "",
}: ChatPanelProps) {
  // ── Local State ──
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [streamingContent, setStreamingContent] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitErrorMsg, setLimitErrorMsg] = useState("");
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeErrorMsg, setResumeErrorMsg] = useState("");
  const [partialContentStore, setPartialContentStore] = useState("");
  const [originalMessageStore, setOriginalMessageStore] = useState("");
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
      try {
        const res = await fetch("/api/user/plan", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated) {
          setUserPlan(data.plan as Plan);
        }
      } catch {
        setUserPlan("free");
      }
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
      /** If this is a resume call, the previous partial content */
      existingPartialContent: string = "",
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
                const displayContent = existingPartialContent ? existingPartialContent + fullContent : fullContent;
                if (chatMode === "generate" || chatMode === "resume") {
                  setStreamingPRDContent(displayContent);
                } else if (chatMode === "revise") {
                  // 1. Live patch PRD secara visual (di PRD Viewer)
                  const patchedPrd = livePatchPrd(currentPrdContent, displayContent);
                  setStreamingPRDContent(patchedPrd);
                  
                  // 2. Sembunyikan tag aneh dari Chat Bubble
                  setStreamingContent(cleanChatBubble(displayContent));
                } else {
                  // For chat mode, stream into chat bubble instead of PRD Viewer
                  setStreamingContent(displayContent);
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
                  (chatMode === "generate" || chatMode === "revise" || chatMode === "resume"
                    ? "Gagal menyusun PRD. Silakan coba lagi."
                    : "Gagal memproses pesan. Silakan coba lagi.");

                // If error occurs during PRD generation and we already have some partial content
                const currentDisplayContent = existingPartialContent ? existingPartialContent + fullContent : fullContent;
                if ((chatMode === "generate" || chatMode === "resume") && currentDisplayContent.length > 0) {
                  setGeneratingPRD(false);
                  setResumeErrorMsg(errorMsg);
                  setPartialContentStore(currentDisplayContent);
                  setOriginalMessageStore(originalMessage);
                  setShowResumeModal(true);
                  return; // Don't add chat bubble, let user interact with modal
                }

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
        if (chatMode === "generate" || chatMode === "resume" || chatMode === "revise") {
          const finalDisplayContent = existingPartialContent ? existingPartialContent + fullContent : fullContent;
          if (finalDisplayContent.trim()) {
            addMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Selesai menyusun PRD.",
              timestamp: Date.now(),
            });
            if (chatMode === "resume" || chatMode === "revise") {
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
          // chatMode === 'chat'
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
        if (chatMode !== "generate" && chatMode !== "resume" && chatMode !== "revise") {
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
    if (resolvedMode !== "revise") {
      setStreamingPRDContent("");
    } else {
      setStreamingPRDContent(currentPrdContent);
    }

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
   * Handle resuming a broken PRD generation from the modal.
   */
  const handleResumePRD = async (newModelId: string) => {
    setSelectedModel(newModelId);
    sessionStorage.setItem("novaplan:selected-model", newModelId);
    setShowResumeModal(false);

    if (isSubmittingRef.current || !partialContentStore) return;

    isSubmittingRef.current = true;
    setStreaming(true);
    setGeneratingPRD(true);
    // DO NOT CLEAR setStreamingPRDContent! We want the partial text to remain visible.
    
    const body: Record<string, unknown> = {
      message: originalMessageStore,
      mode: "resume",
      partialContent: partialContentStore,
      preferences: { model: newModelId },
      // Ensure the user's clean prompt is persisted in the DB so the chat
      // bubble never shows the internal AI template after page remount.
      displayMessage: originalMessageStore,
    };

    if (conversationId) body.conversationId = conversationId;
    if (projectId) body.projectId = projectId;

    await streamApiCall(body, "resume", originalMessageStore, partialContentStore);
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
      if (chatMode !== "revise") {
        setStreamingPRDContent("");
      } else {
        setStreamingPRDContent(currentPrdContent);
      }
      if (chatMode === "generate" || chatMode === "revise") setGeneratingPRD(true);

      const body: Record<string, unknown> = { message: msg, mode: chatMode };
      // Send the original user message for database storage (without template wrapping)
      if (displayMessage && displayMessage !== msg) {
        body.displayMessage = displayMessage;
      }
      if (conversationId) body.conversationId = conversationId;
      if (projectId) body.projectId = projectId;

      // Pass the clean display message as `originalMessage` so that if the
      // stream breaks mid-generation, `originalMessageStore` holds the user's
      // original prompt — not the internal AI template wrapper. This prevents
      // the template text from leaking into the chat bubble after a resume.
      await streamApiCall(body, chatMode, displayMessage || msg);
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
      // Use displayMessage (original user input) for the chat bubble, fallback to prompt
      const bubbleMessage = pending.displayMessage || pending.prompt;
      void handleSendWithMessage(autoMessage, "generate", bubbleMessage);
    } else {
      void handleSendWithMessage(pending.prompt, "chat");
    }
  }, [enableAutoSubmit, handleSendWithMessage, isStreaming, messages.length, setGeneratingPRD]);

  // ── Render ──

  return (
    <div
      className={cn("flex h-full flex-col border-l border-graphite", className)}
      style={{ background: "var(--bg-elevated)" }}
    >
      {/* Header */}
      <div className="border-b border-graphite px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald" />
          <span className="text-sm font-[510] text-snow">NovaPlan AI</span>
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
      <div className="border-t border-graphite p-4">
        <div
          className="relative flex flex-col rounded-md bg-charcoal shadow-[var(--shadow-inset)] transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:shadow-[inset_0_0_0_1px_rgba(94,106,210,0.85)]"
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
              "w-full resize-none border-none bg-transparent px-3 pb-2 pt-3 font-inter text-[14px] text-snow outline-none placeholder:text-slate",
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
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-30 active:scale-[0.98]",
                isStreaming ? "bg-crimson text-white hover:bg-crimson/90" : "btn-primary hover:brightness-105"
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

      {/* Resume PRD Modal */}
      <ResumeErrorModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResume={handleResumePRD}
        errorMessage={resumeErrorMsg}
        userPlan={userPlan}
        currentModelId={selectedModel}
      />
    </div>
  );
}
