import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

export const runtime = "nodejs";

function getSafeNext(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : null;
  const next = getSafeNext(body?.next);
  const codeVerifier = request.cookies.get("insforge_code_verifier")?.value;

  if (!code) {
    return NextResponse.json(
      { error: "missing_oauth_code", message: "OAuth code is missing." },
      { status: 400 },
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: "missing_code_verifier", message: "OAuth code verifier is missing." },
      { status: 400 },
    );
  }

  const client = createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });

  const { data, error } = await client.auth.exchangeOAuthCode(code, codeVerifier);

  if (error || !data?.accessToken || !data.refreshToken || !data.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "oauth_exchange_failed",
        message: error?.message ?? "Failed to exchange OAuth code.",
      },
      { status: error?.statusCode ?? 401 },
    );
  }

  const userClient = createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    accessToken: data.accessToken,
  });

  const { data: profile } = await userClient.database
    .from("users")
    .select("full_name, role")
    .eq("id", data.user.id)
    .single();

  const redirectTo = !profile?.full_name || !profile?.role ? "/onboarding" : next;
  const response = NextResponse.json({ redirectTo });

  // Persist the backend-issued tokens unchanged so InsForge stays the authority
  // over session expiry/revocation. Session lifetime is extended via the SDK's
  // refresh-token flow, not by re-signing the access token with an overridden exp.
  setAuthCookies(
    response.cookies,
    {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    },
    authCookieSettings,
  );
  response.cookies.delete("insforge_code_verifier");

  return response;
}
