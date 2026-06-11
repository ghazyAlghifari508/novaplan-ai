import { createServerClient } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const next = getSafeNext(request.nextUrl.searchParams.get("next"));
  const redirectTo = new URL("/auth/callback", request.nextUrl.origin);
  redirectTo.searchParams.set("next", next);

  const client = createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });

  const { data, error } = await client.auth.signInWithOAuth("google", {
    redirectTo: redirectTo.toString(),
    skipBrowserRedirect: true,
  });

  if (error || !data.url || !data.codeVerifier) {
    const url = new URL("/login", request.nextUrl.origin);
    url.searchParams.set("error", error?.message ?? "oauth_init_failed");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
