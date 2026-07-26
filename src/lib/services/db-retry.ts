/**
 * Shared DB-write retry helper (PRD: docs/plan/ac-generation-reliability-fix.md, US-1).
 * Retries transient InsForge failures (timeout/network/5xx) with exponential backoff + jitter.
 */

const BACKOFF_MS = [500, 1500, 4000];

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted") || msg.includes("econnreset")) return true;
  const statusCode = (err as { statusCode?: number }).statusCode;
  return typeof statusCode === "number" && statusCode >= 500;
}

/**
 * Runs `fn` up to 4 attempts (1 + 3 retries). Logs each retry per AC-1.3.
 * `fn` must be idempotent-safe on retry (e.g. re-fetch next version before insert).
 */
export async function withDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= BACKOFF_MS.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt > BACKOFF_MS.length || !isRetryable(err)) throw err;
      const delay = BACKOFF_MS[attempt - 1] * (0.75 + Math.random() * 0.5);
      console.error(`[DB RETRY] Attempt ${attempt} failed for ${label} - Error: ${err instanceof Error ? err.message : String(err)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
