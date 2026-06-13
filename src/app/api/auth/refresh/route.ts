import { refreshAuth, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";
import { createExtendedAuthTokens } from "@/lib/insforge/session-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const result = await refreshAuth({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    request,
    cookies: request.cookies,
    ...authCookieSettings,
  });

  if (result.error || !result.data?.user || !result.accessToken) {
    return result.response;
  }

  const refreshToken = result.refreshToken ?? request.cookies.get("insforge_refresh_token")?.value;

  if (refreshToken) {
    const sessionTokens = createExtendedAuthTokens({
      accessToken: result.accessToken,
      refreshToken,
    }, result.data.user);
    const response = NextResponse.json({
      ...result.data,
      accessToken: sessionTokens.accessToken,
    });

    setAuthCookies(response.cookies, sessionTokens, authCookieSettings);
    return response;
  }

  return result.response;
}
