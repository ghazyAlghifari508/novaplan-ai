"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Plan } from "@/types/database";
import {
  ALL_MODELS,
  TIER_ORDER,
  TIER_LABELS,
  isModelUnlocked,
  findModel,
} from "@/lib/model-config";
import { ModelIcon } from "@/components/ui/model-icon";

interface ModelDropdownProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
  userPlan: Plan;
  isDisabled?: boolean;
  isStreaming?: boolean;
  /** Where the dropdown opens relative to the button */
  position?: "top" | "bottom";
}

/**
 * Reusable dropdown for selecting AI models.
 * Used in both the PRD detail chat panel and the homepage chat input.
 */
export function ModelDropdown({
  selectedModel,
  onSelect,
  userPlan,
  isDisabled = false,
  isStreaming = false,
  position = "top",
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const selectedModelMeta = findModel(selectedModel);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelect = (modelId: string, isLocked: boolean) => {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    onSelect(modelId);
    setIsOpen(false);
    sessionStorage.setItem("novaplan:selected-model", modelId);
  };

  const positionClass = position === "top"
    ? "absolute bottom-full mb-2 left-0"
    : "absolute top-full mt-2 left-0";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        id="model-selector-btn"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled || isStreaming}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px] font-medium font-schibsted text-text-gray hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        <ModelIcon model={selectedModel} />
        {selectedModelMeta.label}
        <ChevronDown size={11} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            positionClass,
            "z-50 w-52 rounded-xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col"
          )}
          style={{ background: "var(--bg-elevated)" }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {TIER_ORDER.map((tier) => {
              const modelsInTier = ALL_MODELS.filter((m) => m.tier === tier);
              if (modelsInTier.length === 0) return null;
              return (
                <div key={tier} className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-gray/70">
                    {TIER_LABELS[tier]}
                  </div>
                  {modelsInTier.map((model) => {
                    const isLocked = !isModelUnlocked(tier, userPlan);
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id, isLocked)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-medium font-schibsted transition-colors",
                          isSelected ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5",
                          isLocked && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ModelIcon model={model.id} isLocked={isLocked} />
                          <span style={{ color: "var(--text-primary)" }}>{model.label}</span>
                        </div>
                        {isLocked ? (
                          <AlertCircle size={12} className="text-red-500" />
                        ) : isSelected ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-accent-green" />
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
  );
}
