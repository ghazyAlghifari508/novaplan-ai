import { refreshAuth } from "@insforge/sdk/ssr";
import { NextRequest } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";
import { createResilientFetch } from "@/lib/insforge/resilient-fetch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Let the SDK perform the backend refresh and set the refreshed cookies on
  // its response. We return that response verbatim so InsForge stays the
  // authority over session expiry/revocation — no app-side re-signing of the
  // access token, which would override exp and defeat server-side revocation.
  const result = await refreshAuth({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    request,
    cookies: request.cookies,
    fetch: createResilientFetch((attempt, reason) =>
      console.warn(`[auth-refresh-route] retry ${attempt}: ${reason}`),
    ),
    ...authCookieSettings,
  });

  if (result.error) {
    console.warn(`[auth-refresh-route] refresh failed: ${result.error.message}`);
  }

  return result.response;
}
