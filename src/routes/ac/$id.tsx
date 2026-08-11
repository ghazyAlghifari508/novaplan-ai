import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { useEffect } from "react";
import { AcDetail } from "@/components/ac/ac-detail";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { usePathname } from "@/lib/next-compat/navigation";
import { getLatestAcContent } from "@/lib/services/ac-service";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getUserPlanAndQuota, requireUserServer } from "@/lib/session";
import { useLastRoute } from "@/lib/use-last-route";

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadAc = createServerFn({ method: "GET" })
	.validator((id: string) => id)
	.handler(async ({ data: id }) => {
		const user = await requireUserServer();
		const { plan } = await getUserPlanAndQuota();
		const [project, prdContent, acContent] = await Promise.all([
			// ponytail: select only needed cols — name only used downstream. Avoids
			// pulling description/shareToken/lastUrl jsonb on every AC page load.
			db
				.select({ id: projects.id, name: projects.name })
				.from(projects)
				.where(and(eq(projects.id, id), eq(projects.userId, user.id)))
				.limit(1),
			getLatestPrdContent(id),
			getLatestAcContent(id),
		]);

		if (!project[0]) throw new Error("NOT_FOUND");
		return {
			projectId: id,
			projectName: project[0].name,
			latestAcContent: acContent ?? undefined,
			latestPrdContent: prdContent ?? undefined,
			plan,
		};
	});

export const Route = createFileRoute("/ac/$id")({
	loader: async ({ params }) => {
		try {
			return await loadAc({ data: params.id });
		} catch (e) {
			if ((e as Error).message === "Unauthorized")
				throw redirect({ to: "/login" });
			throw e;
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.projectName ?? "AC"} - Acceptance Criteria` },
		],
	}),
	component: AcDetailPage,
	errorComponent: () => (
		<div className="p-10 text-center text-fog">AC tidak ditemukan.</div>
	),
});

function AcDetailPage() {
	const d = Route.useLoaderData();
	const pathname = usePathname();
	const reportLastRoute = useLastRoute(d.projectId);

	useEffect(() => {
		reportLastRoute(pathname);
	}, [pathname, reportLastRoute]);
	return (
		<AcDetail
			projectId={d.projectId}
			projectName={d.projectName}
			latestAcContent={d.latestAcContent}
			latestPrdContent={d.latestPrdContent}
			plan={d.plan}
		/>
	);
}
