import { NextRequest, NextResponse } from "next/server";

/**
 * Security headers applied to every response.
 * ponytail: CSP is relaxed to allow Vercel previews + Midtrans iframe;
 * tighten script-src when you no longer need inline scripts.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const headers = response.headers;

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Enable browser XSS filter
  headers.set("X-XSS-Protection", "1; mode=block");

  // Restrict referrer information
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy: disable features we don't use
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Content Security Policy
  // ponytail: Midtrans Snap needs script-src app.midtrans.com + snap.js
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

  // HSTS (only on HTTPS, skip in dev)
  if (request.url.startsWith("https://")) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
};
