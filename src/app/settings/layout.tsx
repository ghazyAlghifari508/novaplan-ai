import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/settings-client";
import { cache } from "react";

const getSettingsData = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return profile;
});

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const profile = await getSettingsData(user.id);

  return (
    <SettingsClient profile={profile}>
      {children}
    </SettingsClient>
  );
}