export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";

/**
 * DELETE /api/settings/api-keys/:id
 * Revoke (delete) an API key.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();
  const { id } = await params;

  const { error } = await insforge.database
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Gagal menghapus API key" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
