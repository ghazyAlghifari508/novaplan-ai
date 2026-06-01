import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const rateCheck = await checkRateLimit(
      user.id,
      subscription?.plan || "free",
      "api_call",
    );
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment.", retryAfter: 60 },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        },
      );
    }

    // Implementasi manual cascading delete untuk menghindari foreign key constraint error
    // jika aturan ON DELETE CASCADE belum disetup di Supabase.

    // 1. Ambil ID conversation terkait project ini
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .eq("project_id", projectId);

    const convIds = convs?.map((c) => c.id) || [];

    // 2. Hapus messages yang terkait dengan conversation tersebut
    if (convIds.length > 0) {
      await supabase
        .from("messages")
        .delete()
        .in("conversation_id", convIds);
    }

    // 3. Hapus conversations
    await supabase
      .from("conversations")
      .delete()
      .eq("project_id", projectId);

    // 4. Hapus riwayat prd_versions
    await supabase
      .from("prd_versions")
      .delete()
      .eq("project_id", projectId);

    // 5. Terakhir, hapus project utamanya
    const { data: deletedRows, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!deletedRows?.length) {
      console.warn("Project delete returned no rows", {
        userId: user.id,
        projectId,
      });
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await recordRequest(user.id, "api_call");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
