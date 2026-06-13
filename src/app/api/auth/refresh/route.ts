import { refreshAuth } from "@insforge/sdk/ssr";
import { NextRequest } from "next/server";
import { authCookieSettings } from "@/lib/insforge/auth-cookies";

export async function POST(request: NextRequest) {
  const { response } = await refreshAuth({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    request,
    cookies: request.cookies,
    ...authCookieSettings,
  });

  return response;
}
