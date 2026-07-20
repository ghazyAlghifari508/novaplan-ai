import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

const ALLOWED_STEPS = new Set(["prd", "ac", "task"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const insforge = await createServerInsforge();
    const { data: { user } } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF: verify same-origin for state-changing POST
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.endsWith(`://${host}`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const step = body?.step;
    if (!step || !ALLOWED_STEPS.has(step)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
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

    // Update step scoped to owner; RLS also enforces user_id match.
    const { data: updatedRows, error } = await insforge.database
      .from("projects")
      .update({ step })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;

    if (!updatedRows?.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // ponytail: recordRequest failure must not poison the success response.
    try {
      await recordRequest(user.id, "api_call");
    } catch (e) {
      console.error("recordRequest failed (non-fatal):", e);
    }

    return NextResponse.json({ success: true, step });
  } catch (error: unknown) {
    console.error("Error updating project step:", error);
    return NextResponse.json({ error: "Failed to update project step" }, { status: 500 });
  }
}
