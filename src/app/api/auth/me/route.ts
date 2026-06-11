import { createServerInsforge } from "@/lib/insforge/server";
import { NextResponse } from "next/server";

export async function GET() {
  const insforge = await createServerInsforge();
  const { data, error } = await insforge.auth.getCurrentUser();
  const user = data?.user;

  if (error || !user?.id || !user.email) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
