import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { AskFlow } from "@/app/ask/ask-flow";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUserServer } from "@/lib/session";
import { usePathname } from "@/lib/next-compat/navigation";
import { useLastRoute } from "@/lib/use-last-route";
import { useEffect } from "react";

// ponytail: requireUserServer is a server fn → its auth/db imports get pruned
// from the client bundle. Plain `requireUser` would drag pg (→ Buffer) in.
const loadAsk = createServerFn({ method: "GET" })
	.validator((id: string) => id)
	.handler(async ({ data: id }) => {
		const user = await requireUserServer();

		const [project] = await db
			.select({ id: projects.id, name: projects.name })
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.userId, user.id)))
			.limit(1);

		if (!project) throw new Error("NOT_FOUND");

		return { projectId: project.id, projectName: project.name };
	});

export const Route = createFileRoute("/ask/$id")({
	loader: async ({ params }) => {
		try {
			return await loadAsk({ data: params.id });
		} catch (e) {
			if ((e as Error).message === "Unauthorized")
				throw redirect({ to: "/login" });
			throw e;
		}
	},
	head: ({ loaderData }) => ({
		meta: [{ title: loaderData?.projectName || "Question" }],
	}),
	component: AskPage,
	errorComponent: ({ error }) => {
		if (error?.message === "NOT_FOUND") {
			return (
				<div className="p-10 text-center text-fog">Proyek tidak ditemukan.</div>
			);
		}
		return (
			<div className="p-10 text-center text-crimson">Gagal memuat halaman.</div>
		);
	},
});

function AskPage() {
	const d = Route.useLoaderData();
	const pathname = usePathname();
	const reportLastRoute = useLastRoute(d.projectId);

	useEffect(() => {
		reportLastRoute(pathname);
	}, [pathname, reportLastRoute]);
	return <AskFlow projectId={d.projectId} projectName={d.projectName} />;
}
