import { requireAuth, getUserPlan } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysForm } from "@/components/settings/api-keys-form";
import { FEATURES } from "@/types/database";
import Link from "next/link";

export default async function ApiKeysPage() {
  const user = await requireAuth();
  const plan = await getUserPlan();

  if (!FEATURES[plan].apiAccess) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-6">
        <h2 className="mb-4 font-fustat text-xl font-bold">API Keys</h2>
        <p className="text-text-gray">
          API access hanya tersedia untuk plan <strong>Hengker</strong>.
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
  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6">
      <h2 className="mb-6 font-fustat text-xl font-bold">API Keys</h2>
      <p className="mb-6 text-sm text-text-gray">
        Kelola API key untuk akses REST API programmatic. Lihat dokumentasi di {" "}
        <code className="rounded bg-light-gray-bg px-1.5 py-0.5 text-xs font-mono">/api/v1/</code>.
      </p>
      <ApiKeysForm apiKeys={apiKeys || []} />
    </div>
  );
}
