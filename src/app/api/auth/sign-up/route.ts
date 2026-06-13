import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";
import { createExtendedAuthTokens } from "@/lib/insforge/session-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo : undefined;

  if (!email || !password) {
    return NextResponse.json(
      { error: "invalid_registration_data", message: "Email dan password harus diisi." },
      { status: 400 },
    );
  }

  const client = createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });

  const { data, error } = await client.auth.signUp({
    email,
    password,
    redirectTo,
  });

  if (error || !data?.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "sign_up_failed",
        message: error?.message ?? "Gagal membuat akun.",
      },
      { status: error?.statusCode ?? 400 },
    );
  }

  const response = NextResponse.json({
    requireEmailVerification: Boolean(data.requireEmailVerification),
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });

  if (data.accessToken && data.refreshToken) {
    const sessionTokens = createExtendedAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }, data.user);

    setAuthCookies(response.cookies, sessionTokens, authCookieSettings);
  }

  return response;
}
