// ponytail: shared TanStack Query hook for /api/user/plan. Replaces 4 separate
// raw fetch() calls in useEffect across chat-input, credit-exhausted-modal,
// pricing-card, and history-page. Query key ['user-plan'] dedupes requests
// across all components — one fetch serves all. staleTime 60s matches the
// global QueryClient default (providers.tsx). Use refetch() when fresh data is
// required (e.g. before creating a project / navigating from history).
import { useQuery } from "@tanstack/react-query";
import type { Plan } from "@/types/database";

export interface UserPlan {
	authenticated: boolean;
	plan: Plan;
	credits: number;
	creditsUsed: number;
	remaining: number | "unlimited";
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
				};
			}
			return (await res.json()) as UserPlan;
		},
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});
}
