import { createFileRoute } from '@tanstack/react-router'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Link href="/" className="font-inter text-2xl font-semibold tracking-tight">
          NovaPlan
        </Link>
      </div>
      <ForgotPasswordForm />
    </div>
  )
}
