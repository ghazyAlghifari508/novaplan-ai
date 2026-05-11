import { requireAuth, getUserPlan } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplatesForm } from "@/components/settings/templates-form";
import { FEATURES } from "@/types/database";
import Link from "next/link";

export default async function TemplatesPage() {
  const user = await requireAuth();
  const plan = await getUserPlan();

  if (!FEATURES[plan].customTemplate) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-6">
        <h2 className="mb-4 font-fustat text-xl font-bold">Custom Templates</h2>
        <p className="text-text-gray">
          Custom template hanya tersedia untuk plan <strong>Hengker</strong>.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-lg bg-primary-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-text-gray"
        >
          Upgrade ke Hengker
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("prd_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6">
      <h2 className="mb-6 font-fustat text-xl font-bold">Custom Templates</h2>
      <p className="mb-6 text-sm text-text-gray">
        Buat struktur template PRD sendiri. Template bisa dipilih saat mulai chat.
      </p>
      <TemplatesForm templates={templates || []} />
    </div>
  );
}