

import { ALL_MODELS, DEFAULT_MODEL_ID } from "@/lib/model-config";

export const NVIDIA_NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

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

export const RATE_LIMIT_WINDOW_MS = 60_000;
