"use client";

import { cn } from "@/lib/utils";
import type { ModelDefinition } from "@/lib/model-config";
import { findModel } from "@/lib/model-config";
import { Sparkles, Bot } from "lucide-react";
import { SiMeta, SiAnthropic, SiGooglegemini } from "@icons-pack/react-simple-icons";

interface ModelIconProps {
  /** Model ID or a ModelDefinition object */
  model: string | ModelDefinition;
  /** Whether the model is locked for the current user */
  isLocked?: boolean;
  /** Icon size in pixels */
  size?: number;
}

/**
 * Renders the appropriate brand icon for a given AI model.
 * Uses data from model-config.ts to determine which icon and color to use.
 */
export function ModelIcon({ model, isLocked, size = 12 }: ModelIconProps) {
  const def = typeof model === "string" ? findModel(model) : model;
  const className = cn(def.colorClass, isLocked && "opacity-40 grayscale");

  switch (def.brand) {
    case "anthropic":
      return <SiAnthropic size={size} className={className} />;
    case "google":
      return <SiGooglegemini size={size} className={className} />;
    case "meta":
      return <SiMeta size={size} className={className} />;
    case "openai":
    case "bot":
      return <Bot size={size} className={className} />;
    case "sparkles":
    default:
      return <Sparkles size={size} className={className} />;
  }
}
