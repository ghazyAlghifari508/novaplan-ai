import { clearAuthCookies } from "@insforge/sdk/ssr";
import { NextResponse } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response.cookies, authCookieSettings);

  return response;
}
