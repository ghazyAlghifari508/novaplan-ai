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
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-inter text-[11px] font-[510] text-fog shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5 hover:text-snow disabled:opacity-50"
      >
        <ModelIcon model={selectedModel} />
        {selectedModelMeta.label}
        <ChevronDown size={11} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            positionClass,
            "z-50 flex w-[260px] flex-col overflow-hidden rounded-xl bg-obsidian shadow-[var(--shadow-overlay)]"
          )}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {TIER_ORDER.map((tier) => {
              const modelsInTier = ALL_MODELS.filter((m) => m.tier === tier);
              if (modelsInTier.length === 0) return null;
              return (
                <div key={tier} className="py-1">
                  <div className="px-3 py-1 font-inter text-[10px] font-[510] uppercase text-slate">
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
                          "flex w-full items-center justify-between px-3 py-2 text-left font-inter text-[12px] font-[510] transition-colors",
                          isSelected ? "bg-white/5" : "hover:bg-white/5",
                          isLocked && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ModelIcon model={model.id} isLocked={isLocked} />
                          <span style={{ color: "var(--text-primary)" }} className="truncate">{model.label}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <QualityBars quality={model.quality} />
                          {isLocked ? (
                            <AlertCircle size={12} className="text-red-500 shrink-0" />
                          ) : isSelected ? (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          ) : (
                            <div className="h-1.5 w-1.5 shrink-0 opacity-0" />
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
  );
}
