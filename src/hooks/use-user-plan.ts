// ponytail: shared TanStack Query hook for /api/user/plan. Replaces 4 separate
// raw fetch() calls in useEffect across chat-input, credit-exhausted-modal,
// pricing-card, and history-page. Query key ['user-plan'] dedupes requests
// across all components — one fetch serves all. staleTime 60s matches the
// global QueryClient default (providers.tsx). Use refetch() when fresh data is
// required (e.g. before creating a project / navigating from history).
import { useQuery } from "@tanstack/react-query";
import type { Plan } from "@/types/database";

export type SubscriptionUiState =
	| "free_active"
	| "legacy_grandfathered"
	| "active_paid"
	| "paused";

export interface UserPlan {
	authenticated: boolean;
	plan: Plan;
	credits: number;
	creditsUsed: number;
	remaining: number | "unlimited";
	/** Present from the authenticated branch of /api/user/plan. */
	subscriptionState?: SubscriptionUiState;
	/** ISO string of the current billing period end, if any. */
	currentPeriodEnd?: string | null;
}

export function useUserPlan() {
	return useQuery<UserPlan>({
		queryKey: ["user-plan"],
		queryFn: async () => {
			const res = await fetch("/api/user/plan", { cache: "no-store" });
			if (!res.ok) {
				return {
					authenticated: false,
					plan: "free" as Plan,
					credits: 0,
					creditsUsed: 0,
					remaining: 0,
					subscriptionState: "free_active" as const,
				};
			}
			return (await res.json()) as UserPlan;
		},
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});
}
