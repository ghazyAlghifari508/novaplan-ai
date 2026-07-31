import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { payments, quotas, subscriptions } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadBilling = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUserServer()
  const [subRows, paymentRows, quotaRows] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1),
    db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(10),
    db.select().from(quotas).where(eq(quotas.userId, user.id)).limit(1),
  ])
  // ponytail: server fn boundary rejects Date + unknown - coerce to plain JSON.
  const subscription = subRows[0] ? { ...subRows[0], createdAt: subRows[0].createdAt?.toISOString() ?? null, updatedAt: subRows[0].updatedAt?.toISOString() ?? null } : undefined
  const paymentsList = paymentRows.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString() ?? null, updatedAt: p.updatedAt?.toISOString() ?? null, midtransResponse: p.midtransResponse as object | null }))
  const quota = quotaRows[0] ? { ...quotaRows[0], createdAt: quotaRows[0].createdAt?.toISOString() ?? null, updatedAt: quotaRows[0].updatedAt?.toISOString() ?? null } : undefined
  return { subscription, payments: paymentsList, quota }
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
  const { subscription, payments, quota } = Route.useLoaderData()
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2 h-full">
        <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
          <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Billing & Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold capitalize">{subscription?.plan || 'free'}</span>
              <p className="mt-1 text-sm text-(--text-secondary)">
                {subscription?.status === 'active' ? 'Aktif' : 'Tidak aktif'}
              </p>
            </div>
            {subscription?.plan !== 'hengker' && (
              <Link
                href="/pricing"
                className="rounded-lg border border-(--border-subtle) px-4 py-2 text-sm font-medium hover:bg-(--bg-surface)"
              >
                Upgrade
              </Link>
            )}
          </div>

          {quota && (
            <div className="mt-6 rounded-lg bg-(--bg-surface) p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-(--text-secondary)">PRD digunakan</span>
                <span className="font-medium">
                  {quota.prdUsed} / {quota.prdLimit === -1 ? '∞' : quota.prdLimit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-(--text-secondary)">Revisi digunakan</span>
                <span className="font-medium">
                  {quota.revisionUsed} / {quota.revisionLimit === -1 ? '∞' : quota.revisionLimit}
                </span>
              </div>
            </div>
          )}
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
