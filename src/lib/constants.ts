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
    "google/gemma-4-31b-it",                 // Model Google yang efisien dan solid
    "mistralai/mixtral-8x22b-v0.1",          // Mixture of Experts, ngebut dan cerdas
  ],
  hengker: [
    "nvidia/llama-3.1-nemotron-ultra-253b-v1", // Model raksasa, sangat pintar
    "mistralai/mistral-large-3-675b-instruct-2512", // Flagship Mistral, reasoning tinggi
    "qwen/qwen3.5-122b-a10b",                // Flagship Qwen yang sangat cerdas
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

// ─────────────────────────────────────────────
// Chat Constants
// ─────────────────────────────────────────────

/** Minimum prompt length required for PRD generation */
export const MIN_PROMPT_LENGTH = 20;

// ─────────────────────────────────────────────
// Session Storage Keys
// ─────────────────────────────────────────────

export const STORAGE_KEYS = {
  selectedModel: "novaplan:selected-model",
  pendingPrompt: "novaplan:pending-prompt",
} as const;

// ─────────────────────────────────────────────
// User-Facing Error Messages (Indonesian)
// ─────────────────────────────────────────────

export const ERROR_MESSAGES = {
  aiUnavailable: "Maaf, layanan AI sedang tidak tersedia atau sibuk. Silakan coba lagi dalam beberapa saat.",
  prdFailed: "Gagal menyusun PRD. AI tidak menghasilkan konten. Silakan coba lagi.",
  connectionError: "Terjadi kesalahan koneksi.",
  processAborted: "Proses dihentikan.",
  unknownError: "Terjadi kesalahan yang tidak diketahui.",
} as const;