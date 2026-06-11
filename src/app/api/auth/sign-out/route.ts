import { clearAuthCookies } from "@insforge/sdk/ssr";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response.cookies);

  return response;
}
