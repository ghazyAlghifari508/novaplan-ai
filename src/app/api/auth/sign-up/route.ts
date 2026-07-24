import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

export const runtime = "nodejs";

function getSafeRedirect(value: unknown, origin: string) {
  if (typeof value !== "string") return "/";
  // Allow full URLs from same origin (needed by InsForge signUp for email verification links)
  if (value.startsWith(origin)) return value;
  // Allow relative paths
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function POST(request: NextRequest) {
  // ponytail: IP-based rate limit for unauthenticated sign-up (basic brute-force guard).
  // Upgrade to Redis/IP-reputation when abuse spikes.
  // Disabled in development so E2E testing doesn't hit cap.
  if (process.env.NODE_ENV !== "development") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "127.0.0.1";
    const { createServerInsforge } = await import("@/lib/insforge/server");
    const insforge = await createServerInsforge();
    const windowStart = new Date(Date.now() - 60000).toISOString();
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
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const redirectTo = getSafeRedirect(body?.redirectTo, origin);

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

  if (error) {
    console.error("[sign-up] InsForge signUp error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      {
        error: "sign_up_failed",
        message: "Gagal membuat akun. Silakan coba lagi.",
      },
      { status: error.statusCode ?? 400 },
    );
  }

  // When email verification is required InsForge returns
  // requireEmailVerification:true with no accessToken/user —
  // treat as success (user just needs to verify email).
  const requireEmailVerification = Boolean(data?.requireEmailVerification);
  const response = NextResponse.json({
    requireEmailVerification,
    user: data?.user
      ? { id: data.user.id, email: data.user.email }
      : null,
  });

  // Persist tokens as httpOnly cookies so subsequent requests are authenticated.
  // SignUp may return accessToken without refreshToken; set what we have so the
  // session works immediately without requiring a separate sign-in.
  if (data?.accessToken) {
    setAuthCookies(
      response.cookies,
      {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || "",
      },
      authCookieSettings,
    );
  }

  return response;
}
