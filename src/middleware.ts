import { updateSession, type CookieOptions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_REFRESH_LEEWAY_SECONDS, authCookieSettings } from "@/lib/insforge/auth-cookies";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/pricing"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ── Auth session ──
  const sessionResult = await updateSession({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    refreshLeewaySeconds: AUTH_REFRESH_LEEWAY_SECONDS,
    ...authCookieSettings,
    requestCookies: {
      get: (name) => request.cookies.get(name),
      set: (nameOrOptions: string | ({ name: string; value: string } & CookieOptions), value?: string) => {
        let name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
        let val = typeof nameOrOptions === "string" ? (value ?? "") : nameOrOptions.value;
        request.cookies.set(name, val);
        response = NextResponse.next({ request });
      },
      delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
        let name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
        request.cookies.delete(name);
        response = NextResponse.next({ request });
      }
    },
    responseCookies: {
      get: (name) => response.cookies.get(name),
      set: (nameOrOptions: string | ({ name: string; value: string } & CookieOptions), value?: string, options?: CookieOptions) => {
        if (typeof nameOrOptions === "string") {
          response.cookies.set(nameOrOptions, value ?? "", options);
        } else {
          response.cookies.set(nameOrOptions);
        }
      },
      delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
        response.cookies.delete(typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name);
      }
    },
  });

  const isAuthenticated = Boolean(sessionResult.accessToken);
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/prd/share/")
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── Security headers (applied to every response) ──
  // ponytail: CSP relaxed for Vercel previews + Midtrans iframe;
  // tighten script-src when inline scripts no longer needed.
  const headers = response.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.sandbox.midtrans.com https://app.midtrans.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.insforge.app https://*.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.insforge.app https://integrate.api.nvidia.com https://api.sandbox.midtrans.com https://api.midtrans.com",
      "frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")
  );
  if (request.url.startsWith("https://")) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
