import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordForm } from '@/components/auth'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <ResetPasswordForm />
    </div>
  )
}
