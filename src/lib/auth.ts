import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";
import { cache } from "react";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
});

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export const getUserProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});

export const getUserQuota = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: quota } = await supabase
    .from("quotas")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return quota;
});

export const getUserPlan = cache(async (): Promise<Plan> => {
  const user = await getUser();
  if (!user) return "free";

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  return (subscription?.plan as Plan) || "free";
});
