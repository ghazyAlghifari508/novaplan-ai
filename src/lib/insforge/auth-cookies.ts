import type { AuthCookieSettings } from "@insforge/sdk/ssr";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const TWO_MINUTES_SECONDS = 60 * 2;

export const authCookieSettings: AuthCookieSettings = {
  options: {
    accessToken: {
      path: "/",
      // httpOnly prevents JS/XSS from reading the session access token. The
      // InsForge browser client does not require client-side access: when the
      // cookie is unreadable it hydrates the session via the httpOnly refresh
      // cookie through POST /api/auth/refresh (see createBrowserClient ->
      // refreshFromRoute in @insforge/sdk/ssr).
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // No explicit maxAge: the access-token lifetime is backend-driven. The SDK
      // sets the cookie's expiry from the JWT's own `exp` claim (see
      // accessTokenCookieOptions), and the long-lived refresh token below keeps
      // the session alive via silent refresh. This keeps session duration
      // deterministic and consistent across the middleware updateSession path,
      // the /api/auth/refresh route, and the browser client.
    },
    refreshToken: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: THIRTY_DAYS_SECONDS,
    },
  },
};

export const AUTH_REFRESH_LEEWAY_SECONDS = TWO_MINUTES_SECONDS;
