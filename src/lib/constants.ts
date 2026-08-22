import { COMBO_MODEL_ID } from "@/lib/model-config";

const NINE_ROUTER_URL = process.env.NINE_ROUTER_URL || "http://localhost:20128";
export const ROUTER_BASE_URL = `${NINE_ROUTER_URL}/v1`;

// Single combo model — 9Router handles selection + fallback internally.
export const AI_MODELS = {
	primary: COMBO_MODEL_ID,
	fallback: COMBO_MODEL_ID,
	premium: COMBO_MODEL_ID,
} as const;

export const RATE_LIMITS = {
	free: 5,
	pro: 15,
	hengker: 30,
	general: 60,
} as const;

export const RATE_LIMIT_WINDOW_MS = 60_000;

// Pre-byte-retry for AI generation: if the upstream router drops/errors before
// any text-delta leaves the server, retry once before failing the whole request.
// Only safe because no client-visible delta has been emitted yet.
export const AI_STREAM_RETRY_ATTEMPTS = 1;
