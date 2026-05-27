import { requireAuth, getUserProfile } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const profile = await getUserProfile();

  return (
    <SettingsClient profile={profile}>
      {children}
    </SettingsClient>
  );
}