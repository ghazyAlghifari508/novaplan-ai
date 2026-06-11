import { NextRequest } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getUser();
  const body = await req.json();
  const { error, context } = body as { error: string; context?: string };

  const insforge = await createServerInsforge();
  await insforge.database.from("error_reports").insert([{
    user_id: user?.id || null,
    error_message: error || "Unknown error",
    context: context || null,
  }]);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}