import { createServerInsforge } from "@/lib/insforge/server";
import { NextRequest, NextResponse } from "next/server";

function getNextMonthlyReset() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!fullName || !role) {
    return NextResponse.json(
      { error: "invalid_onboarding_data", message: "Nama dan peran wajib diisi." },
      { status: 400 },
    );
  }

  const insforge = await createServerInsforge();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { error: "unauthorized", message: "Session login tidak ditemukan." },
      { status: 401 },
    );
  }

  const now = new Date().toISOString();
  const monthlyReset = getNextMonthlyReset();

  const { data: existingUser } = await insforge.database
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  const userPayload = {
    id: user.id,
    email: user.email,
    full_name: fullName,
    avatar_url: user.profile?.avatar_url ?? null,
    provider: user.providers?.[0] ?? "google",
    role,
    updated_at: now,
  };

  const userResult = existingUser
    ? await insforge.database.from("users").update(userPayload).eq("id", user.id)
    : await insforge.database.from("users").insert([{ ...userPayload, created_at: now }]);

  if (userResult.error) {
    return NextResponse.json(
      { error: "profile_save_failed", message: userResult.error.message },
      { status: 500 },
    );
  }

  const { data: existingSubscription } = await insforge.database
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!existingSubscription) {
    const { error } = await insforge.database.from("subscriptions").insert([
      {
        user_id: user.id,
        plan: "free",
        status: "active",
        current_period_start: now,
        current_period_end: monthlyReset,
      },
    ]);

    if (error) {
      return NextResponse.json(
        { error: "subscription_save_failed", message: error.message },
        { status: 500 },
      );
    }
  }

  const { data: existingQuota } = await insforge.database
    .from("quotas")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!existingQuota) {
    const { error } = await insforge.database.from("quotas").insert([
      {
        user_id: user.id,
        plan: "free",
        prd_used: 0,
        prd_limit: 3,
        revision_used: 0,
        revision_limit: 3,
        reset_at: monthlyReset,
      },
    ]);

    if (error) {
      return NextResponse.json(
        { error: "quota_save_failed", message: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
