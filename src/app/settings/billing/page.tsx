import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function BillingPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const [subResult, paymentsResult, quotaResult] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
    supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("quotas").select("*").eq("user_id", user.id).single(),
  ]);

  const subscription = subResult.data;
  const payments = paymentsResult.data || [];
  const quota = quotaResult.data;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-text-gray hover:text-primary-black">
          ← Dashboard
        </Link>
        <h1 className="mt-2 font-fustat text-3xl font-bold">Billing & Subscription</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="mb-4 font-fustat text-lg font-bold">Plan Saat Ini</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold capitalize">{subscription?.plan || "free"}</span>
              <p className="mt-1 text-sm text-text-gray">
                {subscription?.status === "active" ? "Aktif" : "Tidak aktif"}
              </p>
            </div>
            <Link
              href="/pricing"
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium hover:bg-light-gray-bg"
            >
              Upgrade
            </Link>
          </div>

          {quota && (
            <div className="mt-4 rounded-lg bg-light-gray-bg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">PRD digunakan</span>
                <span>
                  {quota.prd_used} / {quota.prd_limit === -1 ? "∞" : quota.prd_limit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">Revisi digunakan</span>
                <span>
                  {quota.revision_used} / {quota.revision_limit === -1 ? "∞" : quota.revision_limit}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="mb-4 font-fustat text-lg font-bold">Riwayat Pembayaran</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-text-gray">Belum ada pembayaran</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                    <span className="ml-2 text-xs text-text-gray">
                      {formatDate(p.created_at)}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.status === "success"
                        ? "bg-green-100 text-green-800"
                        : p.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}