import { requireAuth } from "@/lib/auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function BillingPage() {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const [subResult, paymentsResult, quotaResult] = await Promise.all([
    insforge.database.from("subscriptions").select("*").eq("user_id", user.id).single(),
    insforge.database.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    insforge.database.from("quotas").select("*").eq("user_id", user.id).single(),
  ]);

  const subscription = subResult.data;
  const payments = paymentsResult.data || [];
  const quota = quotaResult.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2 h-full">
        {/* Plan Saat Ini */}
        <div className="rounded-xl border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6">
          <h2 className="mb-6 font-fustat text-xl font-bold">Billing & Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold capitalize">{subscription?.plan || "free"}</span>
              <p className="mt-1 text-sm text-text-gray dark:text-[#A0A0A0]">
                {subscription?.status === "active" ? "Aktif" : "Tidak aktif"}
              </p>
            </div>
            {subscription?.plan !== "hengker" && (
              <Link
                href="/pricing"
                className="rounded-lg border border-border-subtle dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-light-gray-bg dark:bg-[#161616]"
              >
                Upgrade
              </Link>
            )}
          </div>

          {quota && (
            <div className="mt-6 rounded-lg bg-light-gray-bg dark:bg-[#161616] p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-text-gray dark:text-[#A0A0A0]">PRD digunakan</span>
                <span className="font-medium">
                  {quota.prd_used} / {quota.prd_limit === -1 ? "∞" : quota.prd_limit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-gray dark:text-[#A0A0A0]">Revisi digunakan</span>
                <span className="font-medium">
                  {quota.revision_used} / {quota.revision_limit === -1 ? "∞" : quota.revision_limit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Riwayat Pembayaran */}
        <div className="rounded-xl border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6">
          <h2 className="mb-6 font-fustat text-xl font-bold">Riwayat Pembayaran</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-text-gray dark:text-[#A0A0A0]">Belum ada pembayaran</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle dark:border-white/10 p-4 text-sm"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(p.amount)}</div>
                    <div className="mt-1 text-xs text-text-gray dark:text-[#A0A0A0]">
                      {formatDate(p.created_at)}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      p.status === "success"
                        ? "bg-green-100 text-green-800"
                        : p.status === "pending"
                          ? "bg-steel text-snow"
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
