import { NextRequest } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { getUser } from "@/lib/auth";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  const user = await getUser();
  const body = await req.json();
  const { message, type } = body as { message: string; type: string };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const insforge = await createServerInsforge();
  await insforge.database.from("feedback").insert([{
    user_id: user?.id || null,
    message: message.trim(),
    type: type || "general",
  }]);

  if (resend && process.env.FEEDBACK_EMAIL) {
    await resend.emails.send({
      from: "NovaPlan <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL,
      subject: `[NovaPlan Feedback] ${type?.toUpperCase() || "General"} - ${user?.email || "Anonymous"}`,
      text: `From: ${user?.email || "Anonymous"}\nType: ${type}\n\n${message}`,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}