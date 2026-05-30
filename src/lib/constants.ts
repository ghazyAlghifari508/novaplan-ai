export const APP_NAME = "NovaPlan";
export const APP_DESCRIPTION =
  "Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  free: [
    "meta/llama-3.1-8b-instruct",            // Sangat cepat, kualitas bagus untuk draft
    "meta/llama-3.2-3b-instruct",            // Sangat ringan dan responsif
  ],
  pro: [
    "meta/llama-3.3-70b-instruct",           // Sangat cerdas dan cepat (Rekomendasi Utama)
    "google/gemma-2-27b-it",                 // Model Google yang efisien dan solid
    "mistralai/mixtral-8x22b-instruct-v0.1", // Mixture of Experts, ngebut dan cerdas
  ],
  hengker: [
    "meta/llama-3.1-405b-instruct",          // Model Meta terbesar, sangat pintar
    "mistralai/mistral-large-2-instruct",    // Flagship Mistral, reasoning tinggi
    "qwen/qwen2.5-72b-instruct",             // Flagship Qwen yang sangat cepat
    "meta/llama-3.3-70b-instruct",           // Solid fallback
    "google/gemma-2-27b-it",                 // Solid fallback
    "mistralai/mixtral-8x22b-instruct-v0.1", // Solid fallback
  ],
} as const;

// Primary/fallback shorthands used by ai-client.ts & chat/route.ts
export const AI_MODELS = {
  primary: AI_MODELS_BY_PLAN.free[0],
  fallback: AI_MODELS_BY_PLAN.free[1],
  premium: AI_MODELS_BY_PLAN.pro[0],
} as const;

// Chain used for fallback in chat route (free tier default chain)
export const AI_MODEL_CHAIN = AI_MODELS_BY_PLAN.free;

export const RATE_LIMITS = {
  free: 5,
  pro: 15,
  hengker: 30,
  general: 60,
} as const;

export const MAX_CONVERSATION_HISTORY = 20;
export const MAX_PRD_CHARACTERS = 50000;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const MIDTRANS_SANDBOX_SCRIPT =
  "https://app.sandbox.midtrans.com/snap/snap.js";

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  prdFiles: "prd-files",
} as const;