import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const insforge = await createServerInsforge();
    const { data: { user } } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF: verify same-origin for state-changing DELETE
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.endsWith(`://${host}`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const { data: subscription } = await insforge.database
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

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

    // Implementasi manual cascading delete

    // 1. Ambil ID conversation terkait project ini
    const { data: convs } = await insforge.database
      .from("conversations")
      .select("id")
      .eq("project_id", projectId);

    const convIds = convs?.map((c: { id: string }) => c.id) || [];

    // 2. Delete messages (check error)
    if (convIds.length > 0) {
      const { error: msgError } = await insforge.database
        .from("messages")
        .delete()
        .in("conversation_id", convIds);
      if (msgError) throw msgError;
    }

    // 3. Delete conversations
    const { error: convError } = await insforge.database
      .from("conversations")
      .delete()
      .eq("project_id", projectId);
    if (convError) throw convError;

    // 4. Delete prd_versions
    const { error: prdError } = await insforge.database
      .from("prd_versions")
      .delete()
      .eq("project_id", projectId);
    if (prdError) throw prdError;

    // 5. Terakhir, hapus project utamanya
    const { data: deletedRows, error } = await insforge.database
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
