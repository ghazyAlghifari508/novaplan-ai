"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { saveSetupPrompt } from "@/lib/prompt-handoff";
import { Lock, ChevronDown, Smartphone, Monitor, Check, Sparkles, Bot } from "lucide-react";
import { SiMeta, SiAnthropic, SiGooglegemini } from "@icons-pack/react-simple-icons";
import type { Plan } from "@/types/database";

const ALL_MODELS = [
  { id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 (8B)", tier: "free" as Plan },
  { id: "meta/llama-3.2-3b-instruct", label: "Llama 3.2 (3B)", tier: "free" as Plan },
  { id: "meta/llama-3.3-70b-instruct", label: "Claude Sonnet 4.5", tier: "pro" as Plan },
  { id: "google/gemma-2-27b-it", label: "Gemini Flash 3.5", tier: "pro" as Plan },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Kimi K26", tier: "pro" as Plan },
  { id: "meta/llama-3.1-405b-instruct", label: "Claude Opus 4.7", tier: "hengker" as Plan },
  { id: "mistralai/mistral-large-2-instruct", label: "GPT 5.5", tier: "hengker" as Plan },
  { id: "qwen/qwen2.5-72b-instruct", label: "Deepseek v4 Pro", tier: "hengker" as Plan },
];

const TIER_ORDER: Plan[] = ["free", "pro", "hengker"];

const getModelIcon = (modelId: string, isLocked?: boolean) => {
  let colorClass = "";
  if (modelId === "meta/llama-3.3-70b-instruct" || modelId === "meta/llama-3.1-405b-instruct") colorClass = "text-[#D1A77E]"; // Claude
  else if (modelId === "google/gemma-2-27b-it") colorClass = "text-[#8E75FF]"; // Gemini
  else if (modelId === "mistralai/mistral-large-2-instruct") colorClass = "text-[#10A37F]"; // GPT
  else if (modelId === "qwen/qwen2.5-72b-instruct") colorClass = "text-[#4D93E6]"; // Deepseek
  else if (modelId === "mistralai/mixtral-8x22b-instruct-v0.1") colorClass = "text-indigo-400"; // Kimi
  else if (modelId.startsWith("meta/")) colorClass = "text-[#0668E1]"; // Meta
  
  const className = cn(colorClass, isLocked && "opacity-40 grayscale");

  if (modelId === "meta/llama-3.3-70b-instruct" || modelId === "meta/llama-3.1-405b-instruct") return <SiAnthropic size={12} className={className} />;
  if (modelId === "google/gemma-2-27b-it") return <SiGooglegemini size={12} className={className} />;
  if (modelId === "mistralai/mistral-large-2-instruct" || modelId === "mistralai/mixtral-8x22b-instruct-v0.1" || modelId === "qwen/qwen2.5-72b-instruct") return <Bot size={12} className={className} />;
  if (modelId.startsWith("meta/")) return <SiMeta size={12} className={className} />;
  return <Sparkles size={12} className={className} />;
};

interface ChatInputProps {
  className?: string;
}

export function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [planStatus, setPlanStatus] = useState<{ plan: Plan; remaining: number | "unlimited" } | null>(null);
  const [isMobileMode, setIsMobileMode] = useState(false);
  
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(ALL_MODELS[0].id);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    // Restore preferred model if exists
    const storedModel = sessionStorage.getItem("novaplan:selected-model");
    if (storedModel && ALL_MODELS.some(m => m.id === storedModel)) {
      setSelectedModel(storedModel);
    }

    const fetchStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
      const { data: quota } = await supabase.from("quotas").select("prd_used, prd_limit").eq("user_id", user.id).single();

      if (sub && quota) {
        const plan = sub.plan as Plan;
        setPlanStatus({
          plan,
          remaining: quota.prd_limit === -1 ? "unlimited" : Math.max(0, quota.prd_limit - quota.prd_used),
        });
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Store model & platform preference alongside the prompt
    const enrichedPrompt = isMobileMode
      ? `[Platform: Mobile App]\n${message.trim()}`
      : `[Platform: Web App]\n${message.trim()}`;

    saveSetupPrompt(enrichedPrompt);
    sessionStorage.setItem("novaplan:selected-model", selectedModel);

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/setup")}`);
      return;
    }

    router.push("/setup");
  };

  const userPlan: Plan = planStatus?.plan ?? "free";
  const selectedModelMeta = ALL_MODELS.find((m) => m.id === selectedModel) ?? ALL_MODELS[0];

  const isModelUnlocked = (modelTier: string, currentPlan: Plan) => {
    if (currentPlan === "hengker") return true;
    if (currentPlan === "pro" && (modelTier === "free" || modelTier === "pro")) return true;
    if (currentPlan === "free" && modelTier === "free") return true;
    return false;
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[728px] flex-col rounded-[18px] backdrop-blur-xl transition-all duration-300",
        focused ? "ring-2 ring-primary-black/10" : "",
        className,
      )}
      style={{ background: "rgba(0,0,0,0.24)" }}
    >
      <div className="flex flex-1 flex-col p-[16px] gap-3">
        {/* Top row: Credit info + Mobile/Web toggle */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="font-schibsted text-[12px] font-medium text-white">
              {!planStatus
                ? "3 PRD Gratis"
                : planStatus.plan === "hengker"
                  ? "Akses Unlimited ♾️"
                  : planStatus.plan === "pro"
                    ? `Sisa ${planStatus.remaining} PRD Pro`
                    : `Sisa ${planStatus.remaining} PRD Gratis`}
            </span>
            {(!planStatus || planStatus.plan !== "hengker") && (
              <Link
                href="/pricing"
                className="rounded-full bg-accent-green px-2.5 py-0.5 font-schibsted text-[10px] font-bold text-primary-black dark:text-[#F0F0F0] hover:opacity-90 transition-opacity uppercase tracking-wider cursor-pointer"
              >
                Upgrade
              </Link>
            )}
          </div>

          {/* Mobile / Web Segmented Control */}
          <div
            className="flex items-center gap-0.5 rounded-full p-1 bg-black/5 dark:bg-white/10"
          >
            <button
              id="platform-toggle-mobile-label"
              onClick={() => setIsMobileMode(true)}
              title="Generate PRD untuk Mobile App"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium font-schibsted transition-all duration-200",
                isMobileMode
                  ? "bg-[#3A3A3A] text-white shadow-sm"
                  : "text-black/60 hover:text-black/90 dark:text-white/50 dark:hover:text-white/80"
              )}
            >
              <Smartphone size={12} />
              App
            </button>
            <button
              id="platform-toggle-web"
              onClick={() => setIsMobileMode(false)}
              title="Generate PRD untuk Web App"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium font-schibsted transition-all duration-200",
                !isMobileMode
                  ? "bg-[#3A3A3A] text-white shadow-sm"
                  : "text-black/60 hover:text-black/90 dark:text-white/50 dark:hover:text-white/80"
              )}
            >
              <Monitor size={12} />
              Web
            </button>
          </div>
        </div>

        {/* Main input area */}
        <div
          className="flex flex-col rounded-[12px] shadow-sm border border-[var(--border-subtle)] relative focus-within:border-[var(--border-medium)] transition-colors"
          style={{ background: "var(--bg-elevated)" }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isMobileMode
                ? "Jelaskan aplikasi mobile yang ingin kamu buat..."
                : "Jelaskan produk yang ingin kamu buat..."
            }
            className="w-full resize-none border-none bg-transparent font-schibsted text-[16px] outline-none px-3 pt-3 pb-2"
            style={{ color: "var(--text-primary)", caretColor: "var(--text-primary)" }}
            rows={3}
          />

          {/* Bottom row inside input area */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Model Selector */}
            <div ref={dropdownRef} className="relative">
              <button
                id="model-selector-btn"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px] font-medium font-schibsted text-text-gray hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {getModelIcon(selectedModel)}
                {selectedModelMeta.label}
                <ChevronDown size={11} className={cn("transition-transform", isModelDropdownOpen && "rotate-180")} />
              </button>

              {isModelDropdownOpen && (
                <div
                  className="absolute bottom-full mb-2 left-0 z-50 w-52 rounded-xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    {TIER_ORDER.map((tier) => {
                      const tierModels = ALL_MODELS.filter((m) => m.tier === tier);
                      if (tierModels.length === 0) return null;
                      
                      const unlocked = isModelUnlocked(tier, userPlan);
                      
                      const tierColor = tier === "free" ? "text-blue-500" : tier === "pro" ? "text-purple-500" : "text-amber-500";
                      
                      return (
                        <div key={tier}>
                          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest font-schibsted sticky top-0 border-b border-[var(--border-subtle)]", tierColor)} style={{ background: "var(--bg-elevated)" }}>
                            {tier.toUpperCase()}
                            {!unlocked && <Lock size={9} />}
                          </div>
                          {tierModels.map((model) => {
                            const isSelected = selectedModel === model.id;
                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  if (!unlocked) return;
                                  setSelectedModel(model.id);
                                  setIsModelDropdownOpen(false);
                                }}
                                disabled={!unlocked}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-schibsted transition-colors",
                                  unlocked
                                    ? "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                    : "cursor-not-allowed opacity-40",
                                  isSelected && "bg-black/5 dark:bg-white/10 font-medium"
                                )}
                                style={{ color: "var(--text-primary)" }}
                              >
                                {getModelIcon(model.id, !unlocked)}
                                <span className="flex-1 text-left">{model.label}</span>
                                {!unlocked ? (
                                  <Lock size={10} className="text-text-gray flex-shrink-0" />
                                ) : isSelected ? (
                                  <Check size={10} className="text-accent-green flex-shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[12px] text-text-gray dark:text-[#A0A0A0] font-schibsted">
                {message.length.toLocaleString()}/3,000
              </span>
              <button
                id="hero-send-btn"
                onClick={handleSend}
                disabled={!message.trim()}
                className={cn(
                  "flex h-[36px] w-[36px] items-center justify-center rounded-full transition-all duration-200",
                  message.trim()
                    ? "btn-primary hover:opacity-90"
                    : "bg-[#f8f8f8] dark:bg-[#1A1A1A] text-text-gray dark:text-[#A0A0A0]/40",
                )}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M7 11.5V2.5M7 2.5L2.5 7M7 2.5L11.5 7"
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
      </div>
    </div>
  );
}
