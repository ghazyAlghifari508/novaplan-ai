import { refreshAuth } from "@insforge/sdk/ssr";
import { NextRequest } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

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
    ...authCookieSettings,
  });

  return result.response;
}
