"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const full_name = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  await supabase
    .from("users")
    .update({
      full_name,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/");
  redirect("/");
}