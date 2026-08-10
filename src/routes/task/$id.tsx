import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { usePathname } from '@/lib/next-compat/navigation'
import { useLastRoute } from '@/lib/use-last-route'
import { useEffect } from 'react'
import { getLatestAcContent } from '@/lib/services/ac-service'
import { getTaskTree } from '@/lib/services/task-service'
import { TaskDetail } from '@/components/task/task-detail'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadTask = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await requireUserServer()
    const [project, acContent, taskTree] = await Promise.all([
      // ponytail: select only needed cols — name + taskStatus used downstream.
      // Avoids pulling description/shareToken/lastUrl jsonb on every Task page load.
      db.select({ id: projects.id, name: projects.name, taskStatus: projects.taskStatus }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).limit(1),
      getLatestAcContent(id).catch(() => null),
      getTaskTree(id).catch(() => null),
    ])

    if (!project[0]) throw new Error('NOT_FOUND')
    return {
      projectId: id,
      projectName: project[0].name,
      taskTree,
      hasAc: Boolean(acContent),
      taskStatus: project[0].taskStatus,
    }
  })

export const Route = createFileRoute('/task/$id')({
  loader: async ({ params }) => {
    try {
      return await loadTask({ data: params.id })
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.projectName ?? 'Task'} - Task Board` }] }),
  component: TaskPage,
  errorComponent: () => <div className="p-10 text-center text-fog">Task board tidak ditemukan.</div>,
})

function TaskPage() {
  const d = Route.useLoaderData()
  const pathname = usePathname()
  const reportLastRoute = useLastRoute(d.projectId)

  useEffect(() => {
    reportLastRoute(pathname)
  }, [pathname, reportLastRoute])
  return (
    <TaskDetail
      projectId={d.projectId}
      projectName={d.projectName}
      taskTree={d.taskTree as never}
      hasAc={d.hasAc}
      taskStatus={d.taskStatus}
    />
  )
}
