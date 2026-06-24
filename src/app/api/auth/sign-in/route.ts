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

  // Persist the backend-issued tokens unchanged so InsForge remains the
  // authority over session expiry/revocation. The session is extended via the
  // SDK's refresh-token flow (middleware updateSession / refresh route), not by
  // re-signing the access token with an overridden exp.
  setAuthCookies(
    response.cookies,
    {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    },
    authCookieSettings,
  );

  return response;
}
