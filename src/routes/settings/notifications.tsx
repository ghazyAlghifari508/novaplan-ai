import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notificationPreferences } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { NotificationsForm } from '@/components/settings/notifications-form'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadNotifications = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUserServer()
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1)
  return { preferences: prefs ?? null }
})

export const Route = createFileRoute('/settings/notifications')({
  loader: async () => {
    try {
      return await loadNotifications()
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  component: NotificationsPage,
})

function NotificationsPage() {
  const { preferences } = Route.useLoaderData()
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
      <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Preferensi Notifikasi</h2>
      <NotificationsForm preferences={preferences as never} />
    </div>
  )
}
