import type { Plan } from "@/types/database";

// ─────────────────────────────────────────────
// Single Source of Truth: AI Model Configuration
// ─────────────────────────────────────────────

export interface ModelDefinition {
  /** 9Router model ID (OpenCode Free prefix) */
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
 * ⚠️  When OpenCode Free deprecates a model, update the `id` here.
 *     This is the ONLY place model IDs should live.
 */
export const ALL_MODELS: ModelDefinition[] = [
  // ── Free Tier (OpenCode Free via 9Router) ──
  {
    id: "oc/deepseek-v4-flash-free(high)",
    label: "DeepSeek v4 Flash Free",
    tier: "free",
    brand: "deepseek",
    colorClass: "text-[#4D93E6]",
    quality: 5,
  },
  {
    id: "oc/ling-3.0-flash-free(high)",
    label: "Ling 3.0 Flash Free",
    tier: "free",
    brand: "bot",
    colorClass: "text-[#0668E1]",
    quality: 4,
  },
  {
    id: "oc/north-mini-code-free",
    label: "North Mini Code Free",
    tier: "free",
    brand: "bot",
    colorClass: "text-[#10A37F]",
    quality: 3,
  },

  // ── Pro Tier (OpenCode Free via 9Router) ──
  {
    id: "oc/mimo-v2.5-free",
    label: "MiMo v2.5 Free",
    tier: "pro",
    brand: "sparkles",
    colorClass: "text-[#D1A77E]",
    quality: 4,
  },

  // ── Hengker Tier (OpenCode Free via 9Router) ──
  {
    id: "oc/nemotron-3-ultra-free(high)",
    label: "Nemotron 3 Ultra Free",
    tier: "hengker",
    brand: "anthropic",
    colorClass: "text-[#D1A77E]",
    quality: 5,
  },
  {
    id: "oc/big-pickle",
    label: "Big Pickle Free",
    tier: "hengker",
    brand: "openai",
    colorClass: "text-[#10A37F]",
    quality: 4,
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
