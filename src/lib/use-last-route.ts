import { useEffect, useRef } from "react";

/**
 * Debounced reporter for a project's last-visited URL.
 *
 * Call the returned function whenever the pathname inside a project changes.
 * The hook fires POST /api/projects/$id/last-route at most once per 500 ms,
 * so nested route changes (e.g. tab switches inside /task/$id) don't spam
 * the DB. Errors are silently swallowed — last_url is a best-effort signal.
 *
 * ponytail: no retry, no queue, no visibility. If the POST fails the user
 * still lands on a sensible page via the step fallback in History.
 */
export function useLastRoute(projectId: string): (url: string) => void {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Clear any pending debounce on unmount so we don't fire after the
	// component is gone (e.g. rapid navigation).
	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return (url: string) => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			fetch(`/api/projects/${projectId}/last-route`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			}).catch(() => {
				/* best-effort; no UI impact */
			});
			timerRef.current = null;
		}, 500);
	};
}
