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
	brand:
		| "meta"
		| "kimi"
		| "deepseek"
		| "nvidia"
		| "xiaomi"
		| "bigpickle"
		| "ling"
		| "bot"
		| "poolside"
		| "sparkles";
	/** Tailwind color class for this model's brand */
	colorClass: string;
	/** Quality rating from 1 (poor) to 5 (excellent) */
	quality: 1 | 2 | 3 | 4 | 5;
	/** Speed rating from 1 (slowest) to 5 (fastest), based on measured response times */
	speed: 1 | 2 | 3 | 4 | 5;
	/** Whether model uses reasoning/thinking before output */
	reasoning: boolean;
}

/**
 * All available AI models in NovaPlan, ordered by tier.
 *
 * Tested 2026-08-06 against 9router /v1/chat/completions.
 * ⚠️  Do NOT append (high) suffix — it breaks streaming (30s+ timeouts).
 *
 * FREE - cepat, fungsional:
 *   - Big Pickle (~5s, reasoning, output bagus)
 *   - Laguna S 2.1 (~7s, reasoning, structured output)
 *
 * PRO - reasoning + context besar:
 *   - Nemotron 3 Ultra (~7s, reasoning, output excellent)
 *   - MiMo v2.5 (~7s, vision + reasoning, quality terbaik)
 *
 * HENGKER - paling optimal:
 *   - DeepSeek V4 Flash (~5s, reasoning, output bagus)
 *
 * DROPPED:
 *   - Ling 3.0 Flash (404, model removed from OpenCode)
 *   - North Mini Code (39s, output empty — reasoning only)
 */
export const ALL_MODELS: ModelDefinition[] = [
	// ── Free Tier (cepat, fungsional) ──
	{
		id: "oc/big-pickle",
		label: "Big Pickle",
		tier: "free",
		brand: "bigpickle",
		colorClass: "text-[#7CB342]",
		quality: 4,
		speed: 4,
		reasoning: true,
	},
	{
		id: "oc/laguna-s-2.1-free",
		label: "Laguna S 2.1",
		tier: "free",
		brand: "poolside",
		colorClass: "text-[#A78BFA]",
		quality: 4,
		speed: 3,
		reasoning: true,
	},

	// ── Pro Tier (reasoning + context besar) ──
	{
		id: "oc/nemotron-3-ultra-free",
		label: "Nemotron 3 Ultra",
		tier: "pro",
		brand: "nvidia",
		colorClass: "text-[#76B900]",
		quality: 5,
		speed: 3,
		reasoning: true,
	},
	{
		id: "oc/mimo-v2.5-free",
		label: "MiMo v2.5",
		tier: "pro",
		brand: "xiaomi",
		colorClass: "text-[#FF6900]",
		quality: 4,
		speed: 3,
		reasoning: true,
	},

	// ── Hengker Tier (paling optimal) ──
	{
		id: "oc/deepseek-v4-flash-free",
		label: "DeepSeek v4 Flash",
		tier: "hengker",
		brand: "deepseek",
		colorClass: "text-[#4D93E6]",
		quality: 5,
		speed: 4,
		reasoning: true,
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
	if (userPlan === "pro" && (modelTier === "free" || modelTier === "pro"))
		return true;
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
