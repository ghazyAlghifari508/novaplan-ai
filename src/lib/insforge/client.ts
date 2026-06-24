import { createBrowserClient } from "@insforge/sdk/ssr";
import { AUTH_REFRESH_LEEWAY_SECONDS, authCookieSettings } from "@/lib/insforge/auth-cookies";

// Session hydration note: the access-token cookie is httpOnly (see
// auth-cookies.ts), so the browser client cannot read it on init. Each cold
// client initialization — every new tab and every full page reload — therefore
// performs one POST /api/auth/refresh round-trip to rehydrate the session.
// Within a single client instance concurrent refreshes are de-duplicated, but
// separate tabs/reloads each refresh independently.
//
// This is acceptable because the InsForge backend owns refresh-token rotation:
// the /api/auth/refresh flow reuses the existing refresh token unless the
// backend returns a rotated one, so frequent cold inits do not invalidate
// otherwise-valid sessions. If the backend is configured for strict single-use
// rotation, revisit this — concurrent cold inits across tabs could then race on
// the refresh token.
export const insforge = createBrowserClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  refreshLeewaySeconds: AUTH_REFRESH_LEEWAY_SECONDS,
  ...authCookieSettings,
});
