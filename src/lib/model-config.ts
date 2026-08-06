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
		| "sparkles";
	/** Tailwind color class for this model's brand */
	colorClass: string;
	/** Quality rating from 1 (poor) to 5 (excellent) */
	quality: 1 | 2 | 3 | 4 | 5;
	/** Whether model uses reasoning/thinking before output */
	reasoning: boolean;
}

/**
 * All available AI models in NovaPlan, ordered by tier.
 *
 * Analisa langsung dari endpoint 9Router + test tiap model:
 *
 * FREE - cepat, fungsional, cukup untuk chat ringan:
 *   - Ling 3.0 Flash Free (~2s, flash, output presisi)
 *   - Big Pickle (cepat, output bagus)
 *
 * PRO - reasoning + context besar:
 *   - Nemotron 3 Ultra Free (reasoning ✅, 128K ctx, 1.4s)
 *   - MiMo v2.5 Free (1M ctx, vision, fitur lengkap, tapi lambat ~13.7s)
 *
 * HENGKER - paling optimal:
 *   - DeepSeek V4 Flash Free (reasoning ✅, 1M ctx, 2s, quality 5/5)
 *
 * North Mini Code - DROP (gagal coding, output empty walau 400 tokens)
 *
 * ⚠️  When OpenCode Free deprecates a model, update the `id` here.
 *     This is the ONLY place model IDs should live.
 */
export const ALL_MODELS: ModelDefinition[] = [
	// ── Free Tier (cepat, fungsional) ──
	{
		id: "oc/ling-3.0-flash-free(high)",
		label: "Ling 3.0 Flash",
		tier: "free",
		brand: "ling",
		colorClass: "text-[#1677FF]",
		quality: 4,
		reasoning: false,
	},
	{
		id: "oc/big-pickle",
		label: "Big Pickle",
		tier: "free",
		brand: "bigpickle",
		colorClass: "text-[#7CB342]",
		quality: 4,
		reasoning: true,
	},

	// ── Pro Tier (reasoning + context besar) ──
	{
		id: "oc/nemotron-3-ultra-free(high)",
		label: "Nemotron 3 Ultra",
		tier: "pro",
		brand: "nvidia",
		colorClass: "text-[#76B900]",
		quality: 5,
		reasoning: true,
	},
	{
		id: "oc/mimo-v2.5-free",
		label: "MiMo v2.5",
		tier: "pro",
		brand: "xiaomi",
		colorClass: "text-[#FF6900]",
		quality: 4,
		reasoning: true,
	},

	// ── Hengker Tier (paling optimal) ──
	{
		id: "oc/deepseek-v4-flash-free(high)",
		label: "DeepSeek v4 Flash",
		tier: "hengker",
		brand: "deepseek",
		colorClass: "text-[#4D93E6]",
		quality: 5,
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
