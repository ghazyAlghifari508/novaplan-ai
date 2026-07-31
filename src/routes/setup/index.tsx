import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { requireUserServer } from '@/lib/session'
import { GridBackground } from '@/components/layout'
import { SetupClient } from '@/app/setup/setup-client'

export const Route = createFileRoute('/setup/')({
  beforeLoad: async () => {
    try {
      await requireUserServer()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'Setup PRD - NovaPlan' }] }),
  component: SetupPage,
})

function SetupPage() {
  return (
    <main className="flex flex-col min-h-screen bg-onyx">
      <section
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden pb-20 pt-16"
        style={{ background: 'var(--bg-page)' }}
      >
        <GridBackground />
        <div className="relative z-10 flex w-full flex-col items-center">
          <Suspense fallback={<div className="font-inter text-fog">Loading...</div>}>
            <SetupClient />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
