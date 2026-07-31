import { createFileRoute, redirect } from '@tanstack/react-router'

// ponytail: old InsForge OAuth exchange callback obsolete - Better Auth handles
// social callbacks via /api/auth/*. Redirect any stragglers home.
export const Route = createFileRoute('/auth/callback')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
