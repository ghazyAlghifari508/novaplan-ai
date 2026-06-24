import { requireAuth } from "@/lib/auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { NotificationsForm } from "@/components/settings/notifications-form";

export default async function NotificationsPage() {
  await requireAuth();
  const insforge = await createServerInsforge();

  const { data: preferences } = await insforge.database
    .from("notification_preferences")
    .select("*")
    .single();

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
      <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Preferensi Notifikasi</h2>
      <NotificationsForm preferences={preferences} />
    </div>
  );
}
