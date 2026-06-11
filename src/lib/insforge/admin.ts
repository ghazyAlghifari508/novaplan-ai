import { createAdminClient } from "@insforge/sdk";

/**
 * Admin InsForge client with API key (service role).
 * Bypasses RLS — use only in server-side code.
 */
export function getAdminInsforge() {
  if (!process.env.NEXT_PUBLIC_INSFORGE_URL || !process.env.INSFORGE_API_KEY) {
    throw new Error("Missing InsForge URL or API Key in environment variables.");
  }

  return createAdminClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    apiKey: process.env.INSFORGE_API_KEY,
  });
}
