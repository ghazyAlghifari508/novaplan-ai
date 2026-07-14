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
  // ponytail: IP-based rate limit for unauthenticated sign-up (basic brute-force guard).
  // Upgrade to Redis/IP-reputation when abuse spikes.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
  const { createServerInsforge } = await import("@/lib/insforge/server");
  const insforge = await createServerInsforge();
  const windowStart = new Date(Date.now() - 60000).toISOString(); // 1 minute window
  const { count } = await insforge.database
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", `ip:${ip}`)
    .eq("action", "auth_signup")
    .gte("window_start", windowStart);
  if ((count || 0) >= 5) {
    return NextResponse.json(
      { error: "rate_limited", message: "Terlalu banyak percobaan. Silakan tunggu sebentar." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  await insforge.database.from("rate_limits").insert([{
    user_id: `ip:${ip}`,
    action: "auth_signup",
    request_count: 1,
    window_start: new Date().toISOString(),
  }]);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const redirectTo = getSafeNext(body?.redirectTo);

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
    // Return generic error to prevent email enumeration.
    // InsForge error codes like "user_already_exists" leak to attacker.
    return NextResponse.json(
      {
        error: "sign_up_failed",
        message: "Gagal membuat akun. Silakan coba lagi.",
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
