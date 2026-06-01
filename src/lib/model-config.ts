import type { Plan } from "@/types/database";

// ─────────────────────────────────────────────
// Single Source of Truth: AI Model Configuration
// ─────────────────────────────────────────────

export interface ModelDefinition {
  /** NVIDIA NIM model ID (e.g. "meta/llama-3.1-8b-instruct") */
  id: string;
  /** User-facing display label */
  label: string;
  /** Subscription tier required to use this model */
  tier: Plan;
  /**
   * Brand identifier for icon rendering.
   * Used by <ModelIcon /> to pick the correct icon component.
   */
  brand: "meta" | "anthropic" | "google" | "openai" | "bot" | "sparkles";
  /** Tailwind color class for this model's brand */
  colorClass: string;
}

/**
 * All available AI models in NovaPlan, ordered by tier.
 *
 * ⚠️  When NVIDIA NIM deprecates a model, update the `id` here.
 *     This is the ONLY place model IDs should live.
 */
export const ALL_MODELS: ModelDefinition[] = [
  // ── Free Tier ──
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 (8B)",
    tier: "free",
    brand: "meta",
    colorClass: "text-[#0668E1]",
  },
  {
    id: "meta/llama-3.2-3b-instruct",
    label: "Llama 3.2 (3B)",
    tier: "free",
    brand: "meta",
    colorClass: "text-[#0668E1]",
  },

  // ── Pro Tier ──
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Claude Sonnet 4.5",
    tier: "pro",
    brand: "anthropic",
    colorClass: "text-[#D1A77E]",
  },
  {
    id: "google/gemma-4-31b-it",
    label: "Gemini Flash 3.5",
    tier: "pro",
    brand: "google",
    colorClass: "text-[#8E75FF]",
  },
  {
    id: "mistralai/mixtral-8x22b-v0.1",
    label: "Kimi K26",
    tier: "pro",
    brand: "bot",
    colorClass: "text-indigo-400",
  },

  // ── Hengker Tier ──
  {
    id: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    label: "Claude Opus 4.7",
    tier: "hengker",
    brand: "anthropic",
    colorClass: "text-[#D1A77E]",
  },
  {
    id: "mistralai/mistral-large-2-instruct",
    label: "GPT 5.5",
    tier: "hengker",
    brand: "bot",
    colorClass: "text-[#10A37F]",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    label: "Deepseek v4 Pro",
    tier: "hengker",
    brand: "bot",
    colorClass: "text-[#4D93E6]",
  },
];

/** Tier display order for rendering dropdowns */
export const TIER_ORDER: Plan[] = ["free", "pro", "hengker"];

/** Tier display labels (Indonesian) */
export const TIER_LABELS: Record<Plan, string> = {
  free: "Free Models",
  pro: "Pro Models",
  hengker: "Hengker Models",
};

/** Default model (first free model) */
export const DEFAULT_MODEL_ID = ALL_MODELS[0].id;

/**
 * Check if a user's plan allows access to a given model tier.
 */
export function isModelUnlocked(modelTier: Plan, userPlan: Plan): boolean {
  if (userPlan === "hengker") return true;
  if (userPlan === "pro" && (modelTier === "free" || modelTier === "pro")) return true;
  if (userPlan === "free" && modelTier === "free") return true;
  return false;
}

/**
 * Find a model definition by its ID.
 * Returns the default model if not found.
 */
export function findModel(modelId: string): ModelDefinition {
  return ALL_MODELS.find((m) => m.id === modelId) ?? ALL_MODELS[0];
}

/**
 * Get models filtered by tier.
 */
export function getModelsByTier(tier: Plan): ModelDefinition[] {
  return ALL_MODELS.filter((m) => m.tier === tier);
}
