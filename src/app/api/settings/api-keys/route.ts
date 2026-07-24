export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";
import crypto from "crypto";

const ALLOWED_SCOPES = ["read:project", "write:task:status", "write:subtask:status"];

/**
 * POST /api/settings/api-keys
 * Create a new API key. Raw key returned ONCE.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();
  const body = await req.json();
  const { name, scopes } = body;

  if (!name || typeof name !== "string" || name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: "Nama key harus 1-100 karakter" }, { status: 400 });
  }

  if (!Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json({ error: "Minimal satu scope harus dipilih" }, { status: 400 });
  }
  if (scopes.some((s: string) => !ALLOWED_SCOPES.includes(s))) {
    return NextResponse.json({ error: "Scope tidak valid" }, { status: 400 });
  }

  // Generate raw key and hash it
  const rawKey = `novaplan_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 10);

  const { data, error } = await insforge.database
    .from("api_keys")
    .insert([{
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
    }])
    .select("id")
    .single();

  if (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Gagal membuat API key" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, rawKey });
}
