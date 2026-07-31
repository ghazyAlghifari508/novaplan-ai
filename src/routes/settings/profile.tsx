import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { quotas, subscriptions, users } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { ProfileForm } from '@/components/settings/profile-form'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUserServer()
  const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  const [sub] = await db.select({ plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1)
  const plan = sub?.status === 'active' ? sub.plan : 'free'
  return { profile, email: user.email, plan }
})

export const Route = createFileRoute('/settings/profile')({
  loader: async () => {
    try {
      return await loadProfile()
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { profile, email, plan } = Route.useLoaderData()
  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] p-6"
      style={{ background: 'var(--bg-elevated)' }}
    >
      <h2 className="mb-6 font-inter font-[510] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Edit Profil
      </h2>
      <ProfileForm
        profile={{
          full_name: profile?.fullName ?? null,
          avatar_url: profile?.image ?? null,
          email,
          plan,
        }}
      />
    </div>
  )
}
