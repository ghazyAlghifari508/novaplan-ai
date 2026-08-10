import { createFileRoute } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { requireUser } from '@/lib/session'
import { saveAcVersion } from '@/lib/services/ac-service'
import { sanitizeErrorForClient } from '@/lib/services/error-sanitizer'

/**
 * POST /api/ac/save - client recovery (PRD US-2): saves AC content already
 * rendered on the client when the SSE generate route's automatic save failed.
 * No AI call - plain insert via saveAcVersion.
 */
export const Route = createFileRoute('/api/ac/save')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireUser(getRequestHeaders())
        let projectId: string
        let content: string
        try {
          const body = await request.json()
          projectId = body?.projectId
          content = body?.content
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (!projectId || !content) {
          return Response.json({ error: 'projectId and content required' }, { status: 400 })
        }

        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
          .limit(1)
        if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

        try {
          const { acVersionId, version } = await saveAcVersion(
            projectId,
            content,
            'Retry Simpan (recovery)',
          )
          return Response.json({ acVersionId, version })
        } catch (err) {
          console.error('ac/save recovery failed:', err)
          return Response.json({ error: sanitizeErrorForClient(err, 'ac') }, { status: 500 })
        }
      },
    },
  },
})
