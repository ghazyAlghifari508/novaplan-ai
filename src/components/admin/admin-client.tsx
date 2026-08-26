"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	ArrowLeft,
	LayoutDashboard,
	MessageSquare,
	Users,
} from "lucide-react";
import { memo } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/admin", label: "Overview", icon: LayoutDashboard },
	{ href: "/admin/users", label: "Pengguna", icon: Users },
	{ href: "/admin/feedback", label: "Feedback & Error", icon: MessageSquare },
] as const;

export const AdminClient = memo(function AdminClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = useLocation({ select: (l) => l.pathname });

	return (
		<div className="flex min-h-screen flex-col bg-onyx text-snow md:flex-row">
			{/* Sidebar - fixed on desktop, horizontal scroll on mobile */}
			<aside className="left-0 top-0 z-40 flex w-full shrink-0 flex-col border-b border-graphite bg-charcoal font-inter md:fixed md:bottom-0 md:w-64 md:border-r">
				{/* Top Branding */}
				<div className="flex items-center justify-between p-4 md:block md:p-6 md:pb-4">
					<div className="flex items-center gap-2.5">
						<Logo height={22} />
						<span className="rounded bg-white/10 px-1.5 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wider text-mist">
							Admin
						</span>
					</div>
					<p className="hidden mt-2 font-inter text-xs text-fog md:block">
						Pusat kontrol & manajemen sistem
					</p>
				</div>

				<div className="hidden h-px w-full bg-graphite md:block" />

				{/* Nav Links */}
				<nav className="flex items-center gap-1.5 overflow-x-auto p-3 hide-scrollbar md:flex-1 md:flex-col md:items-stretch md:space-y-1 md:p-4">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive =
							pathname === item.href ||
							(item.href !== "/admin" && pathname.startsWith(item.href)) ||
							(item.href === "/admin" && pathname === "/admin/");

						return (
							<Link
								key={item.href}
								to={item.href}
								className={cn(
									"flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-[510] transition-colors md:px-3 md:py-2.5 md:text-sm",
									isActive
										? "bg-obsidian text-snow shadow-[var(--shadow-inset)]"
										: "text-fog hover:bg-white/5 hover:text-snow",
								)}
							>
								<Icon
									size={16}
									className={isActive ? "text-snow" : "text-fog"}
								/>
								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* Bottom: Back to Workspace */}
				<div className="hidden border-t border-graphite p-4 md:block">
					<Link
						to="/"
						className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-[510] text-fog transition-colors hover:bg-white/5 hover:text-snow"
					>
						<ArrowLeft size={14} />
						<span>Kembali ke Workspace</span>
					</Link>
				</div>
			</aside>

			{/* Main Content Area */}
			<main className="w-full flex-1 overflow-x-hidden p-6 md:ml-64 sm:p-8 lg:p-10">
				{children}
			</main>
		</div>
	);
});
