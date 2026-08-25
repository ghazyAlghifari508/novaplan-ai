import { COMBO_MODEL_ID } from "@/lib/model-config";

const NINE_ROUTER_URL = process.env.NINE_ROUTER_URL || "http://localhost:20128";
export const ROUTER_BASE_URL = `${NINE_ROUTER_URL}/v1`;

// Single combo model — 9Router handles selection + fallback internally.
export const AI_MODELS = {
	primary: COMBO_MODEL_ID,
	fallback: COMBO_MODEL_ID,
	premium: COMBO_MODEL_ID,
} as const;

// Internal utility calls (project summary, etc.) reuse the combo model.
export const SUMMARY_MODEL = COMBO_MODEL_ID;

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

// No-progress watchdog: if upstream emits no text-delta AND no reasoning-delta
// for this long, abort and surface an error instead of an infinite spinner.
export const AI_STALL_TIMEOUT_MS = 120_000;

// Hard ceiling per generation (covers full stream including burst + tokens).
export const AI_TOTAL_TIMEOUT_MS = 600_000;

// Bounded wait before a 409 when another generation still holds the claim —
// an aborted request releases ac_status/task_status asynchronously, so an
// immediate retry (StrictMode double-mount) must give it time to free up.
export const CLAIM_POLL_MS = 500;
export const CLAIM_RETRY_MS = 2000;
// Max time a second generate caller (AC or Task) waits for an in-flight
// sibling attempt to settle before giving up silently (prevents stacked
// duplicate requests).
export const GUARD_WAIT_MS = 3000;

export const MIN_PROMPT_LENGTH = 20;
export const MAX_PROMPT_LENGTH = 3000;
export const HOME_DRAFT_DEBOUNCE_MS = 300;
export const HISTORY_PAGE_SIZE = 12;
export const BRIEF_MAX_CHARS = 5000;
export const BRIEF_MAX_BYTES = 2 * 1024 * 1024;
export const PDF_STYLES = { font: "Inter", headerSize: 14, bodySize: 11 } as const;

export const KANBAN_SSE_INTERVAL_MS = 3_000;
export const KANBAN_POLL_INTERVAL_MS = 10_000;
