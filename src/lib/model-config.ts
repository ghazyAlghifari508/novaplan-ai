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
  brand: "meta" | "anthropic" | "google" | "openai" | "kimi" | "deepseek" | "bot" | "sparkles";
  /** Tailwind color class for this model's brand */
  colorClass: string;
  /** Quality rating from 1 (poor) to 5 (excellent) */
  quality: 1 | 2 | 3 | 4 | 5;
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
    quality: 4,
  },
  {
    id: "meta/llama-3.2-3b-instruct",
    label: "Llama 3.2 (3B)",
    tier: "free",
    brand: "meta",
    colorClass: "text-[#0668E1]",
    quality: 2,
  },

  // ── Pro Tier ──
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Claude Sonnet 4.5",
    tier: "pro",
    brand: "anthropic",
    colorClass: "text-[#D1A77E]",
    quality: 5,
  },
  {
    id: "google/gemma-4-31b-it",
    label: "Gemini Flash 3.5",
    tier: "pro",
    brand: "google",
    colorClass: "text-[#8E75FF]",
    quality: 2,
  },
  {
    id: "mistralai/mixtral-8x22b-v0.1",
    label: "Kimi K26",
    tier: "pro",
    brand: "kimi",
    colorClass: "text-indigo-400",
    quality: 4,
  },

  // ── Hengker Tier ──
  {
    id: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    label: "Claude Opus 4.7",
    tier: "hengker",
    brand: "anthropic",
    colorClass: "text-[#D1A77E]",
    quality: 3,
  },
  {
    id: "mistralai/mistral-large-2-instruct",
    label: "GPT 5.5",
    tier: "hengker",
    brand: "openai",
    colorClass: "text-[#10A37F]",
    quality: 5,
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    label: "Deepseek v4 Pro",
    tier: "hengker",
    brand: "deepseek",
    colorClass: "text-[#4D93E6]",
    quality: 3,
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
 * Return unlocked model IDs with the paid tier first, then lower tiers as fallback.
 */
export function getUnlockedModelIds(userPlan: Plan): string[] {
  const userTierIndex = TIER_ORDER.indexOf(userPlan);
  const allowedTiers = TIER_ORDER.slice(0, userTierIndex + 1).reverse();

  return allowedTiers.flatMap((tier) =>
    ALL_MODELS.filter((model) => model.tier === tier).map((model) => model.id),
  );
}

/**
 * Find a model definition by its ID.
 * Returns the default model if not found.
 */
export function findModel(modelId: string): ModelDefinition {
  return ALL_MODELS.find((m) => m.id === modelId) ?? ALL_MODELS[0];
}
