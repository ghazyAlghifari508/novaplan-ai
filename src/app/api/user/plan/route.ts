import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ plan: "free" });
    }

    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const subscription = subscriptions?.[0];

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ plan: "free" });
    }

    return NextResponse.json({ plan: subscription.plan });
  } catch {
    return NextResponse.json({ plan: "free" });
  }
}
