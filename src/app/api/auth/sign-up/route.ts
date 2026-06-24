import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

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
    // Persist the backend-issued tokens unchanged so InsForge stays the
    // authority over session expiry/revocation. Session lifetime is extended
    // via the SDK's refresh-token flow, not by re-signing the access token.
    setAuthCookies(
      response.cookies,
      {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
      authCookieSettings,
    );
  }

  return response;
}
