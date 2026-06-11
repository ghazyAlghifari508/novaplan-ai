import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

/**
 * Server-side InsForge client.
 * Reads access token from httpOnly cookie and injects into the client
 * so database queries run with the user's RLS context.
 */
export async function createServerInsforge() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("insforge_access_token")?.value;

  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: cookieStore,
    accessToken,
  });
}
