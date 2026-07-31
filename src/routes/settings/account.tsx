import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireUserServer } from '@/lib/session'
import { AccountForm } from '@/components/settings/account-form'

export const Route = createFileRoute('/settings/account')({
  beforeLoad: async () => {
    try {
      await requireUserServer()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    const user = await requireUserServer()
    return { email: user.email }
  },
  component: AccountPage,
})

function AccountPage() {
  const { email } = Route.useLoaderData()
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
      <h2 className="mb-6 font-inter font-[510] text-xl font-bold">Pengaturan Akun</h2>
      <AccountForm email={email} />
    </div>
  )
}
