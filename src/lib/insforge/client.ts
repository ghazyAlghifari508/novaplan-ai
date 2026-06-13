import { createBrowserClient } from "@insforge/sdk/ssr";
import { AUTH_REFRESH_LEEWAY_SECONDS, authCookieSettings } from "@/lib/insforge/auth-cookies";

export const insforge = createBrowserClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  refreshLeewaySeconds: AUTH_REFRESH_LEEWAY_SECONDS,
  ...authCookieSettings,
});
