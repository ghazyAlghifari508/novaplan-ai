

import { ALL_MODELS, DEFAULT_MODEL_ID, getUnlockedModelIds } from "@/lib/model-config";
import type { Plan } from "@/types/database";

// NVIDIA NIM API
export const NVIDIA_NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Model tiers for NovaPlan AI (NVIDIA NIM)
 *
 * FREE    → Fast, lightweight models (8B and under)
 * PRO     → High-quality, fast mid-tier models (70B, 27B)
 * HENGKER → Flagship models (405B, Large) and all Pro models
 */
export const AI_MODELS_BY_PLAN = {
  free: getUnlockedModelIds("free"),
  pro: getUnlockedModelIds("pro"),
  hengker: getUnlockedModelIds("hengker"),
} satisfies Record<Plan, string[]>;

// Primary/fallback shorthands used by ai-client.ts & chat/route.ts
export const AI_MODELS = {
  primary: DEFAULT_MODEL_ID,
  fallback: ALL_MODELS.find((model) => model.tier === "free" && model.id !== DEFAULT_MODEL_ID)?.id ?? DEFAULT_MODEL_ID,
  premium: ALL_MODELS.find((model) => model.tier === "pro")?.id ?? DEFAULT_MODEL_ID,
} as const;


export const RATE_LIMITS = {
  free: 5,
  pro: 15,
  hengker: 30,
  general: 60,
} as const;

export const MAX_CONVERSATION_HISTORY = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;


export const STORAGE_BUCKETS = {
  avatars: "avatars",
  prdFiles: "prd-files",
} as const;
