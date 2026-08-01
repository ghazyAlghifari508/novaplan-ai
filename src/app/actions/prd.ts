/**
 * PRD project actions - ported from Next "use server" actions to TanStack
 * server functions. Client wrappers keep the `<form action={fn}>` + FormData
 * call shape the components already use; redirects run client-side (matches
 * the login `window.location.assign` pattern).
 *
 * ponytail: schema fork - old InsForge `projects` had a `preferences` jsonb col
 * that the new flat schema dropped, so duplicate no longer copies it.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/session";

const _rename = createServerFn({ method: "POST" })
  .validator((d: { projectId: string; name: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser(getRequestHeaders());
    const { db } = await import("@/db");
    const { projects } = await import("@/db/schema");
    const name = data.name.trim();
    if (!name) return;
    await db
      .update(projects)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, user.id)));
  });

export async function renamePrd(projectId: string, formData: FormData) {
  const name = (formData.get("name") as string) ?? "";
  await _rename({ data: { projectId, name } });
}

const _duplicate = createServerFn({ method: "POST" })
  .validator((d: string) => d)
  .handler(async ({ data: projectId }): Promise<string | null> => {
    const user = await requireUser(getRequestHeaders());
    const { db } = await import("@/db");
    const { prdVersions, projects } = await import("@/db/schema");

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .limit(1);
    if (!project) return null;

    const newId = crypto.randomUUID();
    await db.insert(projects).values({
      id: newId,
      userId: user.id,
      name: `${project.name} (Copy)`,
      status: "draft",
      mode: project.mode,
    });

    const [latest] = await db
      .select({ content: prdVersions.content })
      .from(prdVersions)
      .where(eq(prdVersions.projectId, projectId))
      .orderBy(desc(prdVersions.version))
      .limit(1);

    if (latest) {
      await db.insert(prdVersions).values({
        id: crypto.randomUUID(),
        projectId: newId,
        version: 1,
        content: latest.content,
        changeSummary: "Duplicated PRD",
      });
    }
    return newId;
  });

export async function duplicatePrd(projectId: string) {
  const newId = await _duplicate({ data: projectId });
  if (newId) window.location.assign(`/prd/${newId}`);
}
