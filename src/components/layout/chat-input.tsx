"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveSetupPrompt } from "@/lib/prompt-handoff";
import { Lock, ChevronDown, Smartphone, Monitor, Check } from "lucide-react";
import type { Plan } from "@/types/database";
import {
  ALL_MODELS,
  TIER_ORDER,
  DEFAULT_MODEL_ID,
  isModelUnlocked,
  findModel,
} from "@/lib/model-config";
import { ModelIcon } from "@/components/ui/model-icon";

const MIN_PROMPT_LENGTH = 20;

interface ChatInputProps {
  className?: string;
}

function QualityBars({ quality }: { quality: number }) {
  const color = quality <= 2 ? "bg-red-500" : quality === 3 ? "bg-amber-500" : "bg-emerald-500";
  
  return (
    <div className="flex items-end gap-[2px] h-[12px] opacity-80" title={`Model Quality: ${quality}/5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <div 
          key={level}
          className={cn(
            "w-[3px] rounded-[1px] transition-colors duration-300",
            level <= quality ? color : "bg-graphite",
            level === 1 ? "h-[4px]" : 
            level === 2 ? "h-[6px]" : 
            level === 3 ? "h-[8px]" : 
            level === 4 ? "h-[10px]" : "h-[12px]"
          )}
        />
      ))}
    </div>
  );
}

export function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [planStatus, setPlanStatus] = useState<{ plan: Plan; remaining: number | "unlimited" } | null>(null);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [promptError, setPromptError] = useState("");
  
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    // Restore preferred model if exists
    const storedModel = sessionStorage.getItem("novaplan:selected-model");
    if (storedModel && ALL_MODELS.some(m => m.id === storedModel)) {
      setSelectedModel(storedModel);
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/user/plan", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated) {
          const plan = data.plan as Plan;
          setPlanStatus({
            plan,
            remaining: data.remaining === "unlimited" ? "unlimited" : Number(data.remaining ?? 0),
          });
        }
      } catch {
        setPlanStatus(null);
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

    if (message.trim().length < MIN_PROMPT_LENGTH) {
      setPromptError(`Deskripsikan produkmu lebih detail (minimal ${MIN_PROMPT_LENGTH} karakter) agar AI bisa menghasilkan PRD yang berkualitas.`);
      return;
    }
    setPromptError("");

    // Store model & platform preference alongside the prompt
    const originalMessage = message.trim();
    const enrichedPrompt = isMobileMode
      ? `[Platform: Mobile App]\n${originalMessage}`
      : `[Platform: Web App]\n${originalMessage}`;

    saveSetupPrompt(enrichedPrompt);
    // Save original message for display in chat bubble (without platform tags)
    sessionStorage.setItem("novaplan:original-message", originalMessage);
    sessionStorage.setItem("novaplan:selected-model", selectedModel);

    let isAuthenticated = false;
    try {
      const authRes = await fetch("/api/auth/me", { cache: "no-store" });
      isAuthenticated = authRes.ok;
    } catch {
      isAuthenticated = false;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/setup")}`);
      return;
    }

    router.push("/setup");
  };

  const userPlan: Plan = planStatus?.plan ?? "free";
  const selectedModelMeta = findModel(selectedModel);



  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[728px] flex-col rounded-xl bg-charcoal p-1.5 shadow-[var(--shadow-surface)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        focused ? "shadow-[var(--shadow-focus)]" : "",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 rounded-[10px] bg-obsidian p-4">
        {/* Top row: Credit info + Mobile/Web toggle */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="font-inter text-[12px] font-[510] text-mist">
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
                className="cursor-pointer rounded-[2px] px-2 py-0.5 font-inter text-[10px] font-[510] uppercase text-fog shadow-[var(--shadow-inset)] transition-colors duration-300 hover:bg-steel/70"
              >
                Upgrade
              </Link>
            )}
          </div>

          {/* Mobile / Web Segmented Control */}
          <div
            className="flex items-center gap-0.5 rounded-md bg-charcoal p-1 shadow-[var(--shadow-inset)]"
          >
            <button
              id="platform-toggle-mobile-label"
              onClick={() => setIsMobileMode(true)}
              title="Generate PRD untuk Mobile App"
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 font-inter text-[11px] font-[510] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isMobileMode
                  ? "bg-steel text-snow"
                  : "text-fog hover:text-snow"
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
                "flex items-center gap-1.5 rounded px-2.5 py-1 font-inter text-[11px] font-[510] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                !isMobileMode
                  ? "bg-steel text-snow"
                  : "text-fog hover:text-snow"
              )}
            >
              <Monitor size={12} />
              Web
            </button>
          </div>
        </div>

        {/* Main input area */}
        <div
          className="relative flex flex-col rounded-md bg-charcoal shadow-[var(--shadow-inset)] transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:shadow-[var(--shadow-focus)]"
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
            className="w-full resize-none border-none bg-transparent px-3 pb-2 pt-3 font-inter text-[15px] text-snow outline-none placeholder:text-slate"
            style={{ caretColor: "var(--text-primary)" }}
            rows={3}
          />

          {/* Bottom row inside input area */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Model Selector */}
            <div ref={dropdownRef} className="relative">
              <button
                id="model-selector-btn"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-inter text-[11px] font-[510] text-fog shadow-[var(--shadow-inset)] transition-colors duration-300 hover:bg-steel/70 hover:text-snow"
              >
                <ModelIcon model={selectedModel} />
                {selectedModelMeta.label}
                <ChevronDown size={11} className={cn("transition-transform", isModelDropdownOpen && "rotate-180")} />
              </button>

              {isModelDropdownOpen && (
                <div
                  className="absolute bottom-full left-0 z-50 mb-2 flex w-[260px] flex-col overflow-hidden rounded-xl bg-obsidian shadow-[var(--shadow-overlay)]"
                >
                  <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                    {TIER_ORDER.map((tier) => {
                      const tierModels = ALL_MODELS.filter((m) => m.tier === tier);
                      if (tierModels.length === 0) return null;
                      
                      const unlocked = isModelUnlocked(tier, userPlan);
                      
                      const tierColor = tier === "free" ? "text-fog" : tier === "pro" ? "text-indigo" : "text-mist";
                      
                      return (
                        <div key={tier}>
                          <div className={cn("sticky top-0 z-10 flex items-center gap-1.5 border-b border-graphite bg-obsidian px-3 py-1.5 font-inter text-[10px] font-[510] uppercase", tierColor)}>
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
                                  "flex w-full items-center gap-2.5 px-3 py-2 font-inter text-[12px] transition-colors",
                                  unlocked
                                    ? "cursor-pointer hover:bg-white/5"
                                    : "cursor-not-allowed opacity-40",
                                  isSelected && "bg-white/5 font-[510]"
                                )}
                                style={{ color: "var(--text-primary)" }}
                              >
                                <ModelIcon model={model.id} isLocked={!unlocked} />
                                <span className="flex-1 text-left">{model.label}</span>
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                  <QualityBars quality={model.quality} />
                                  {!unlocked ? (
                                    <Lock size={10} className="flex-shrink-0 text-fog" />
                                  ) : isSelected ? (
                                    <Check size={10} className="flex-shrink-0 text-emerald-500" />
                                  ) : (
                                    <div className="w-[10px]" />
                                  )}
                                </div>
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
              <span className={cn("font-inter text-[12px]", message.trim().length > 0 && message.trim().length < MIN_PROMPT_LENGTH ? "text-crimson" : "text-fog")}>
                {message.length.toLocaleString()}/3,000
              </span>
              <button
                id="hero-send-btn"
                onClick={handleSend}
                disabled={!message.trim()}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                  message.trim()
                    ? "btn-primary hover:brightness-105"
                    : "bg-steel/40 text-slate",
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

        {/* Prompt error message */}
        {promptError && (
          <div className="px-3 pb-2">
            <p className="animate-in fade-in slide-in-from-top-1 font-inter text-[12px] text-crimson duration-200">
              {promptError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
