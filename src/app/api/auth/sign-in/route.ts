import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";
import { createExtendedAuthTokens } from "@/lib/insforge/session-token";

export const runtime = "nodejs";

function getSafeNext(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const redirectTo = getSafeNext(body?.redirectTo);

  if (!email || !password) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "Email dan password harus diisi." },
      { status: 400 },
    );
  }

  const client = createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.accessToken || !data.refreshToken || !data.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "sign_in_failed",
        message: error?.message ?? "Gagal login. Cek kembali email dan password.",
      },
      { status: error?.statusCode ?? 401 },
    );
  }

  const response = NextResponse.json({
    redirectTo,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });

  const sessionTokens = createExtendedAuthTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  }, data.user);

  setAuthCookies(response.cookies, sessionTokens, authCookieSettings);

  return response;
}
