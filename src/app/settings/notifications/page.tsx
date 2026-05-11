import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationsForm } from "@/components/settings/notifications-form";

export default async function NotificationsPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .single();

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6">
      <h2 className="mb-6 font-fustat text-xl font-bold">Preferensi Notifikasi</h2>
      <NotificationsForm preferences={preferences} />
    </div>
  );
}
