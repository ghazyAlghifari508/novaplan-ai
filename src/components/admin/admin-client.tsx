"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	ArrowLeft,
	CreditCard,
	Eye,
	EyeOff,
	FolderGit2,
	LayoutDashboard,
	MessageSquare,
	Settings,
	Users,
} from "lucide-react";
import type React from "react";
import { memo } from "react";
import {
	StreamerModeProvider,
	useStreamerMode,
} from "@/components/admin/streamer-mode-context";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
	{
		href: "/admin",
		label: "Ringkasan",
		icon: LayoutDashboard,
		isActive: (p: string) => p === "/admin" || p === "/admin/",
	},
	{
		href: "/admin/users",
		label: "Pengguna",
		icon: Users,
		isActive: (p: string) => p.startsWith("/admin/users"),
	},
	{
		href: "/admin/feedback",
		label: "Tiket",
		icon: MessageSquare,
		isActive: (p: string) => p.startsWith("/admin/feedback"),
	},
	{
		href: "/admin/projects",
		label: "Proyek",
		icon: FolderGit2,
		isActive: (p: string) => p.startsWith("/admin/projects"),
	},
	{
		href: "/admin/transactions",
		label: "Transaksi",
		icon: CreditCard,
		isActive: (p: string) => p.startsWith("/admin/transactions"),
	},
	{
		href: "/settings/profile",
		label: "Pengaturan",
		icon: Settings,
		isActive: (p: string) =>
			p.startsWith("/admin/settings") || p.startsWith("/settings"),
	},
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
	const pathname = useLocation({ select: (l) => l.pathname });
	const { isStreamerMode, toggleStreamerMode } = useStreamerMode();

	return (
		<div className="flex min-h-screen flex-col bg-onyx font-inter text-snow">
			{/* Sticky Top-Nav Header */}
			<header className="sticky top-0 z-40 w-full border-b border-graphite bg-charcoal/95 backdrop-blur">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					{/* Header Row 1: Brand + Workspace Link + Streamer Mode Toggle */}
					<div className="flex h-14 items-center justify-between gap-4 border-b border-graphite/60">
						<div className="flex items-center gap-3">
							<Logo height={22} />
							<div className="flex items-center gap-1.5">
								<span className="rounded bg-white/10 px-1.5 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wider text-mist">
									Admin
								</span>
								<span className="hidden text-sm font-medium text-snow sm:inline">
									Panel
								</span>
							</div>

							<div className="hidden h-4 w-px bg-graphite sm:block" />

							<Link
								to="/"
								className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-[510] text-fog transition-colors hover:bg-white/5 hover:text-snow"
							>
								<ArrowLeft size={13} />
								<span className="hidden sm:inline">Kembali ke Workspace</span>
								<span className="sm:hidden">Workspace</span>
							</Link>
						</div>

						{/* Streamer Mode Toggle Button */}
						<button
							type="button"
							onClick={toggleStreamerMode}
							className={cn(
								"flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
								isStreamerMode
									? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
									: "border-graphite bg-obsidian text-fog hover:border-mist/30 hover:text-snow",
							)}
							title={
								isStreamerMode
									? "Streamer Mode aktif (Data sensitif disamarkan)"
									: "Aktifkan Streamer Mode untuk menyamarkan nominal dan data pengguna"
							}
						>
							<span
								className={cn(
									"h-2 w-2 rounded-full",
									isStreamerMode ? "bg-emerald-400 animate-pulse" : "bg-fog/50",
								)}
							/>
							{isStreamerMode ? <EyeOff size={14} /> : <Eye size={14} />}
							<span className="hidden xs:inline sm:inline">Streamer Mode</span>
							<span
								className={cn(
									"rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
									isStreamerMode
										? "bg-emerald-500/20 text-emerald-300"
										: "bg-white/5 text-fog",
								)}
							>
								{isStreamerMode ? "ON" : "OFF"}
							</span>
						</button>
					</div>

					{/* Header Row 2: Horizontal Navigation Tabs */}
					<nav className="flex items-center gap-1.5 overflow-x-auto py-2.5 hide-scrollbar">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = item.isActive(pathname);

							return (
								<Link
									key={item.label}
									to={item.href}
									preload="intent"
									className={cn(
										"flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-[510] transition-colors",
										isActive
											? "border border-graphite/80 bg-obsidian text-snow shadow-[var(--shadow-inset)]"
											: "text-fog hover:bg-white/5 hover:text-snow",
									)}
								>
									<Icon
										size={14}
										className={isActive ? "text-snow" : "text-fog"}
									/>
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
				{children}
			</main>
		</div>
	);
}

export const AdminClient = memo(function AdminClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<StreamerModeProvider>
			<AdminShellInner>{children}</AdminShellInner>
		</StreamerModeProvider>
	);
});
