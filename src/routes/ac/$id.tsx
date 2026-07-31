import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { requireUserServer, getUserPlanAndQuota } from '@/lib/session'
import { getLatestPrdContent } from '@/lib/services/prd-service'
import { getAcVersions } from '@/lib/services/ac-service'
import { AcDetail } from '@/components/ac/ac-detail'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadAc = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await requireUserServer()
    const { plan } = await getUserPlanAndQuota()
    const [project, prdContent, acVersions] = await Promise.all([
      db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).limit(1),
      getLatestPrdContent(id),
      getAcVersions(id),
    ])

    if (!project[0]) throw new Error('NOT_FOUND')
    return {
      projectId: id,
      projectName: project[0].name,
      latestAcVersion: acVersions[0],
      latestPrdContent: prdContent ?? undefined,
      plan,
    }
  })

export const Route = createFileRoute('/ac/$id')({
  loader: async ({ params }) => {
    try {
      return await loadAc({ data: params.id })
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.projectName ?? 'AC'} - Acceptance Criteria` }] }),
  component: AcDetailPage,
  errorComponent: () => <div className="p-10 text-center text-fog">AC tidak ditemukan.</div>,
})

function AcDetailPage() {
  const d = Route.useLoaderData()
  return (
    <AcDetail
      projectId={d.projectId}
      projectName={d.projectName}
      latestAcVersion={d.latestAcVersion as never}
      latestPrdContent={d.latestPrdContent}
      plan={d.plan}
    />
  )
}
