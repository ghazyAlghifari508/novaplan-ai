// ponytail: compat shim so ported components keep `next/navigation` imports.
// Vite aliases `next/navigation` -> this file. Upgrade path: rewrite call sites
// to native TanStack hooks when a component is otherwise touched.
import {
	useLocation,
	useMatches,
	useNavigate,
	useRouter as useTanstackRouter,
} from "@tanstack/react-router";

type Href = string;

// next/router-style imperative API mapped onto TanStack Router.
export function useRouter() {
	const navigate = useNavigate();
	const router = useTanstackRouter();

	return {
		// next: router.push(href) - string path. TanStack navigate accepts string `to`.
		push: (href: Href) => navigate({ to: href as never }),
		replace: (href: Href) => navigate({ to: href as never, replace: true }),
		back: () => router.history.back(),
		forward: () => router.history.forward(),
		// next: router.refresh() re-runs server data. Closest: invalidate loaders.
		refresh: () => router.invalidate(),
		prefetch: () => Promise.resolve(),
	};
}

export function usePathname(): string {
	return useLocation({ select: (l) => l.pathname });
}

export function useSearchParams(): URLSearchParams {
	const search = useLocation({ select: (l) => l.searchStr });
	return new URLSearchParams(search);
}

// next/navigation also exports these; provide no-op/basic parity.
export function useParams<T = Record<string, string>>(): T {
	const matches = useMatches();
	const leaf = matches[matches.length - 1];
	return (leaf?.params ?? {}) as T;
}
