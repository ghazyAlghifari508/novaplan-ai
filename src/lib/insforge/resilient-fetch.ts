// Wraps fetch with retry+backoff for InsForge's auth refresh calls.
//
// Root cause this patches: @insforge/sdk's refreshAuth() (ssr.mjs) issues a raw
// fetch() to POST /api/auth/refresh with NO retry — unlike the SDK's main HTTP
// client, which already retries 5xx/network errors with backoff. Any transient
// failure (network blip, InsForge cold start, a 504 like the one observed
// directly from InsForge's own CLI during this investigation) is treated
// identically to "refresh token invalid" and both auth cookies are cleared,
// logging the user out even though the refresh token was still valid.
//
// Pass this as the `fetch` option to updateSession()/refreshAuth() — both
// honor options.fetch for their internal call (verified in ssr.mjs).
//
// Known ceiling: if InsForge commits the refresh (rotates the token
// server-side) but the response is lost before a retry fires, the retry reuses
// the now-stale refreshToken and gets a genuine "invalid" error — the same
// rotation-race class already noted in client.ts's cold-init comment, just one
// layer deeper. Only matters if InsForge enforces strict single-use rotation;
// revisit both call sites together if that changes.
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createResilientFetch(
  onRetry?: (attempt: number, reason: string) => void,
): typeof fetch {
  return async (input, init) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(input, init);
        if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
          onRetry?.(attempt + 1, `HTTP ${response.status}`);
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          onRetry?.(attempt + 1, err instanceof Error ? err.message : String(err));
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
      }
    }
    throw lastError;
  };
}
