export const APP_NAME = "NovaPlan";
export const APP_DESCRIPTION =
  "Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AI_MODELS = {
  primary: "meta-llama/llama-3.3-70b-instruct:free",
  fallback: "google/gemma-4-31b-it:free",
  premium: "nvidia/nemotron-3-super-120b-a12b:free",
} as const;

// Fallback chain: tried in order if previous model is rate-limited
export const AI_MODEL_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-coder:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

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