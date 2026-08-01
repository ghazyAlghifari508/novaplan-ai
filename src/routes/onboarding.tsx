import { createFileRoute } from '@tanstack/react-router'
import { OnboardingForm } from '@/components/auth'
import { Logo } from '@/components/ui/logo'

export const Route = createFileRoute('/onboarding')({ component: OnboardingPage })

function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo height={40} />
      </div>
      <OnboardingForm />
    </div>
  )
}
