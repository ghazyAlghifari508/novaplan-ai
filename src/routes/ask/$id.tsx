import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { useEffect, useState } from "react";
import { AskFlow } from "@/app/ask/ask-flow";
import { ContextUpload } from "@/components/ask/context-upload";
import { db } from "@/db";
import { projects } from "@/db/schema";
import {
	clearBriefContext,
	getBriefContext,
	saveBriefContext,
} from "@/lib/prompt-handoff";
import { requireUserServer } from "@/lib/session";
import { useLastRoute } from "@/lib/use-last-route";

// ponytail: requireUserServer is a server fn → its auth/db imports get pruned
// from the client bundle. Plain `requireUser` would drag pg (→ Buffer) in.
const loadAsk = createServerFn({ method: "GET" })
	.validator((id: string) => id)
	.handler(async ({ data: id }) => {
		const user = await requireUserServer();

		const [project] = await db
			.select({ id: projects.id, name: projects.name, step: projects.step })
			.from(projects)
			.where(and(eq(projects.id, id), eq(projects.userId, user.id)))
			.limit(1);

		if (!project) throw new Error("NOT_FOUND");

		return {
			projectId: project.id,
			projectName: project.name,
			step: (project as { step?: string | null }).step ?? null,
		};
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
	const pathname = useLocation({ select: (l) => l.pathname });
	const reportLastRoute = useLastRoute(d.projectId);
	const [briefContext, setBriefContext] = useState(() => {
		if (typeof window === "undefined") return "";
		return getBriefContext();
	});

	useEffect(() => {
		reportLastRoute(pathname);
	}, [pathname, reportLastRoute]);

	useEffect(() => {
		if (briefContext) saveBriefContext(briefContext);
		else clearBriefContext();
	}, [briefContext]);

	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<ContextUpload onContext={setBriefContext} />
			<AskFlow projectId={d.projectId} projectName={d.projectName} />
		</div>
	);
}
