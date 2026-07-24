/**
 * API Key authentication middleware for /api/v1/* routes.
 * Validates Bearer token against api_keys table using SHA-256 hash.
 * Pattern: extract token → hash → lookup → validate expiry + scopes → return userId.
 */

import { createServerInsforge } from "@/lib/insforge/server";
import crypto from "crypto";

export interface ApiKeyAuthResult {
  userId: string;
  scopes: string[];
  keyId: string;
}

export interface ApiKeyAuthError {
  error: string;
  status: 401 | 403 | 429;
}

/**
 * Authenticate request via Bearer token.
 * Returns userId + scopes on success, or error response on failure.
 */
export async function apiKeyAuth(
  req: Request
): Promise<ApiKeyAuthResult | ApiKeyAuthError> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      status: 401,
    };
  }

  const rawKey = authHeader.slice(7).trim();

  if (!rawKey) {
    return { error: "API key required", status: 401 };
  }

  // Hash the incoming key to match key_hash in DB
  const keyHash = crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");

  const insforge = await createServerInsforge();

  // Query api_keys to find matching key
  const { data: keyRecord, error: keyError } = await insforge.database
    .from("api_keys")
    .select("id, user_id, scopes, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError || !keyRecord) {
    return { error: "Invalid API key", status: 401 };
  }

  // Check key expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { error: "API key expired", status: 401 };
  }

  // Parse scopes
  const scopes: string[] = Array.isArray(keyRecord.scopes)
    ? keyRecord.scopes
    : typeof keyRecord.scopes === "string"
      ? (() => { try { return JSON.parse(keyRecord.scopes); } catch { return []; } })()
      : [];

  // Update last_used_at (non-blocking)
  Promise.resolve(
    insforge.database
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id)
  ).catch(() => {});

  return {
    userId: keyRecord.user_id,
    scopes,
    keyId: keyRecord.id,
  };
}

/**
 * Check if auth result has required scope.
 */
export function hasScope(
  auth: ApiKeyAuthResult,
  requiredScope: string
): boolean {
  return (
    auth.scopes.includes(requiredScope) ||
    auth.scopes.includes("admin") ||
    auth.scopes.includes("*")
  );
}

/**
 * Verify project ownership for authenticated user.
 */
export async function verifyProjectOwnership(
  userId: string,
  projectId: string
): Promise<boolean> {
  const insforge = await createServerInsforge();
  const { data } = await insforge.database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}
