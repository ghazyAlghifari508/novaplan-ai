import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/register-form'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="text-(--text-secondary) flex h-screen w-screen items-center justify-center bg-(--bg-card)">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
