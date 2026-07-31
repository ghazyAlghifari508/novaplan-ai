import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { requireUserServer } from '@/lib/session'
import { GridBackground } from '@/components/layout'
import { ManualSetupClient } from '@/app/setup/manual/manual-setup-client'

export const Route = createFileRoute('/setup/manual')({
  beforeLoad: async () => {
    try {
      await requireUserServer()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'Detail PRD - NovaPlan' }] }),
  component: ManualSetupPage,
})

function ManualSetupPage() {
  return (
    <main className="flex flex-col min-h-screen bg-onyx">
      <section
        className="relative flex flex-1 flex-col items-center overflow-hidden py-16"
        style={{ background: 'var(--bg-page)' }}
      >
        <GridBackground />
        <div className="relative z-10 flex w-full flex-col items-center">
          <Suspense fallback={<div className="font-inter text-fog">Loading...</div>}>
            <ManualSetupClient />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
