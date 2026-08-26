import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminClient } from "@/components/admin/admin-client";
import { requireAdminServer } from "@/lib/session";

export const Route = createFileRoute("/admin")({
	beforeLoad: async () => {
		try {
			await requireAdminServer();
		} catch {
			throw redirect({ to: "/login" });
		}
	},
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<AdminClient>
			<Outlet />
		</AdminClient>
	);
}
