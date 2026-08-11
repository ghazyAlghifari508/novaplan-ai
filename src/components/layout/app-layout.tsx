"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "./navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	// Hide navbar on auth pages and PRD index page (has its own back button)
	// Show navbar everywhere except bare auth/minimal pages.
	// PRD/AC/Task/Kanban pages get the flow step navigation.
	const hideNavbarRoutes = [
		"/login",
		"/auth/callback",
		"/prd",
		"/onboarding",
		"/settings",
	];
	const hideNavbar =
		hideNavbarRoutes.includes(pathname) || pathname.startsWith("/settings/");

	// Lock body scroll on workspace pages (Ask, PRD, AC, Task, Kanban)
	const isWorkspace =
		pathname.startsWith("/ask/") ||
		(pathname.startsWith("/prd/") && !pathname.startsWith("/prd/share/")) ||
		pathname.startsWith("/ac/") ||
		pathname.startsWith("/task/") ||
		pathname.startsWith("/kanban/");

	useEffect(() => {
		if (isWorkspace) {
			document.body.style.overflow = "hidden";
			document.body.style.overscrollBehavior = "contain";
		} else {
			document.body.style.overflow = "";
			document.body.style.overscrollBehavior = "";
		}
		return () => {
			document.body.style.overflow = "";
			document.body.style.overscrollBehavior = "";
		};
	}, [isWorkspace]);

	return (
		<>
			{!hideNavbar && <Navbar />}
			<div
				className={
					hideNavbar
						? "flex flex-col min-h-screen"
						: isWorkspace
							? "pt-14 flex flex-col h-screen overflow-hidden"
							: "pt-14 flex flex-col min-h-screen"
				}
			>
				{children}
			</div>
		</>
	);
}
