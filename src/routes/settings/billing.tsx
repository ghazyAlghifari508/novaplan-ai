import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { payments, subscriptions } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadBilling = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUserServer()
  const [subRows, paymentRows] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1),
    db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(10),
  ])
  // ponytail: server fn boundary rejects Date + unknown - coerce to plain JSON.
  const subscription = subRows[0] ? { ...subRows[0], createdAt: subRows[0].createdAt?.toISOString() ?? null, updatedAt: subRows[0].updatedAt?.toISOString() ?? null } : undefined
  const paymentsList = paymentRows.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString() ?? null, updatedAt: p.updatedAt?.toISOString() ?? null, midtransResponse: p.midtransResponse as object | null }))
  return { subscription, payments: paymentsList }
})

export const Route = createFileRoute('/settings/billing')({
  loader: async () => {
    try {
      return await loadBilling()
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  component: BillingPage,
})

function BillingPage() {
  const { subscription, payments } = Route.useLoaderData()
  const credits = (subscription as Record<string, unknown>)?.credits as number ?? 0
  const creditsUsed = (subscription as Record<string, unknown>)?.creditsUsed as number ?? 0
  const remaining = Math.max(0, credits - creditsUsed)
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2 h-full">
        <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
          <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Billing & Kredit</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold capitalize">{subscription?.plan || 'free'}</span>
              <p className="mt-1 text-sm text-(--text-secondary)">
                {subscription?.status === 'active' ? 'Aktif' : 'Tidak aktif'}
              </p>
            </div>
            <Link
              href="/pricing"
              className="rounded-lg border border-(--border-subtle) px-4 py-2 text-sm font-medium hover:bg-(--bg-surface)"
            >
              Beli Kredit
            </Link>
          </div>

          <div className="mt-6 rounded-lg bg-(--bg-surface) p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-(--text-secondary)">Kredit digunakan</span>
              <span className="font-medium">
                {creditsUsed} / {credits}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--bg-card)">
              <div
                className="h-full rounded-full bg-indigo transition-all"
                style={{ width: `${credits > 0 ? ((credits - creditsUsed) / credits) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-(--text-secondary)">
              {remaining > 0
                ? `Sisa ${remaining} kredit. Kredit tidak pernah hangus.`
                : "Kredit habis. Beli kredit untuk melanjutkan."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
          <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Riwayat Pembayaran</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-(--text-secondary)">Belum ada pembayaran</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-4 text-sm"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(p.amount ?? 0)}</div>
                    <div className="mt-1 text-xs text-(--text-secondary)">
                      {formatDate(p.createdAt ?? '')}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      p.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : p.status === 'pending'
                          ? 'bg-steel text-snow'
                          : 'bg-red-100 text-red-800'
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
  )
}
