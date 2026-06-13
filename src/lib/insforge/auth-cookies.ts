import type { AuthCookieSettings } from "@insforge/sdk/ssr";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
const TWO_MINUTES_SECONDS = 60 * 2;

export const authCookieSettings: AuthCookieSettings = {
  options: {
    accessToken: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
