import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useUserPlan } from "@/hooks/use-user-plan";

/**
 * Global pause notice (spec §8). Rendered inside AppLayout next to the
 * Navbar; driven entirely by server truth (/api/user/plan) — no client-side
 * guessing from credit counts.
 */
export function SubscriptionBanner() {
	const { data } = useUserPlan();
	if (!data?.authenticated || data.subscriptionState !== "paused") return null;

	return (
		<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
			<AlertTriangle size={16} className="shrink-0" aria-hidden />
			<span>
				Masa aktif langganan <b className="capitalize">{data.plan}</b> sudah
				habis — sisa kredit hangus dan generate terkunci.
			</span>
			<Link
				to="/settings/billing"
				className="font-semibold underline underline-offset-2 hover:opacity-80"
			>
				Perpanjang atau batalkan
			</Link>
		</div>
	);
}
