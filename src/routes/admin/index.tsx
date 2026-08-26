import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowUpRight,
	Coins,
	CreditCard,
	FileCode2,
	FileSpreadsheet,
	FolderGit2,
	Layers,
	ListTodo,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	type AdminDashboardMetrics,
	getAdminDashboardMetrics,
} from "@/lib/services/admin-service";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
	loader: async (): Promise<AdminDashboardMetrics> => {
		return await getAdminDashboardMetrics();
	},
	component: AdminDashboardPage,
});

function AdminDashboardPage() {
	const metrics = Route.useLoaderData();

	const totalPipelineOutputs =
		metrics.prdCount + metrics.acCount + metrics.tasksCount;

	return (
		<div className="mx-auto max-w-6xl space-y-8 font-inter">
			{/* Page Header */}
			<header className="border-b border-graphite pb-6">
				<h1 className="font-inter text-2xl font-[510] text-snow">
					System Overview
				</h1>
				<p className="mt-1 text-sm text-fog">
					Metrik real-time pengguna, aktivitas pipeline AI, dan pendapatan
					platform.
				</p>
			</header>

			{/* 4 Key Metric Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricCard
					label="Total Pengguna"
					value={metrics.usersCount}
					subtext={`${metrics.planDistribution.find((p) => p.plan === "hengker")?.count ?? 0} Hengker, ${metrics.planDistribution.find((p) => p.plan === "pro")?.count ?? 0} Pro`}
					icon={Users}
				/>
				<MetricCard
					label="Total Proyek"
					value={metrics.projectsCount}
					subtext="Proyek ide produk dibuat"
					icon={FolderGit2}
				/>
				<MetricCard
					label="Output Pipeline AI"
					value={totalPipelineOutputs}
					subtext={`${metrics.prdCount} PRD · ${metrics.acCount} AC · ${metrics.tasksCount} Task`}
					icon={Layers}
				/>
				<MetricCard
					label="Total Pendapatan"
					value={formatCurrency(metrics.totalRevenue)}
					subtext="Total transaksi Midtrans"
					icon={Coins}
				/>
			</div>

			{/* Pipeline AI Breakdown */}
			<section className="rounded-xl border border-graphite bg-charcoal p-6">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="text-base font-[510] text-snow">
							Aktivitas Generasi AI (Pipeline)
						</h2>
						<p className="text-xs text-fog">
							Total dokumen & breakdown artifact yang berhasil di-generate
						</p>
					</div>
					<Activity size={18} className="text-fog" />
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
					<div className="rounded-lg border border-graphite bg-obsidian p-4">
						<div className="flex items-center gap-2 text-fog">
							<FileSpreadsheet size={16} className="text-mist" />
							<span className="text-xs font-[510]">PRD Dokumen</span>
						</div>
						<p className="mt-2 text-2xl font-light text-snow">
							{metrics.prdCount}
						</p>
						<p className="mt-1 text-[11px] text-fog">Versi PRD disimpan</p>
					</div>

					<div className="rounded-lg border border-graphite bg-obsidian p-4">
						<div className="flex items-center gap-2 text-fog">
							<FileCode2 size={16} className="text-mist" />
							<span className="text-xs font-[510]">Acceptance Criteria</span>
						</div>
						<p className="mt-2 text-2xl font-light text-snow">
							{metrics.acCount}
						</p>
						<p className="mt-1 text-[11px] text-fog">Versi AC terbuat</p>
					</div>

					<div className="rounded-lg border border-graphite bg-obsidian p-4">
						<div className="flex items-center gap-2 text-fog">
							<ListTodo size={16} className="text-mist" />
							<span className="text-xs font-[510]">Task & Kanban</span>
						</div>
						<p className="mt-2 text-2xl font-light text-snow">
							{metrics.tasksCount}
						</p>
						<p className="mt-1 text-[11px] text-fog">Butir task dibuat</p>
					</div>
				</div>
			</section>

			{/* 2-Column: Recent Projects & Plan Distribution */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Recent Projects (2 cols) */}
				<section className="rounded-xl border border-graphite bg-charcoal p-6 lg:col-span-2">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-base font-[510] text-snow">Proyek Terbaru</h2>
							<p className="text-xs text-fog">
								Aktivitas pembuatan proyek paling akhir
							</p>
						</div>
					</div>

					{metrics.recentProjects.length === 0 ? (
						<p className="py-8 text-center text-xs text-fog">
							Belum ada proyek yang dibuat.
						</p>
					) : (
						<div className="divide-y divide-graphite rounded-lg border border-graphite bg-obsidian">
							{metrics.recentProjects.map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between p-3.5 transition-colors hover:bg-white/[0.02]"
								>
									<div className="min-w-0 pr-4">
										<p className="truncate text-sm font-[510] text-snow">
											{p.name}
										</p>
										<p className="truncate text-xs text-fog">
											{p.userName || p.userEmail || "Anonymous"}
										</p>
									</div>

									<div className="flex items-center gap-3">
										<span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-[510] uppercase text-mist">
											{p.step || "draft"}
										</span>
										<Link
											to="/prd/$id"
											params={{ id: p.id }}
											className="text-fog hover:text-snow"
											title="Buka proyek"
										>
											<ArrowUpRight size={16} />
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				{/* Plan Distribution (1 col) */}
				<section className="rounded-xl border border-graphite bg-charcoal p-6">
					<h2 className="text-base font-[510] text-snow">Distribusi Paket</h2>
					<p className="text-xs text-fog">Tier langganan pengguna</p>

					<div className="mt-4 space-y-3">
						{["free", "pro", "hengker"].map((tier) => {
							const item = metrics.planDistribution.find(
								(p) => p.plan === tier,
							);
							const count = item?.count ?? 0;
							const total = metrics.usersCount || 1;
							const pct = Math.round((count / total) * 100);

							return (
								<div
									key={tier}
									className="rounded-lg border border-graphite bg-obsidian p-3"
								>
									<div className="flex items-center justify-between text-xs font-[510]">
										<span className="capitalize text-snow">{tier}</span>
										<span className="text-fog">
											{count} user ({pct}%)
										</span>
									</div>
									<div className="mt-2 h-1.5 w-full rounded-full bg-graphite overflow-hidden">
										<div
											className={`h-full rounded-full ${
												tier === "hengker"
													? "bg-amber-400"
													: tier === "pro"
														? "bg-indigo-400"
														: "bg-fog"
											}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}

function MetricCard({
	label,
	value,
	subtext,
	icon: Icon,
}: {
	label: string;
	value: string | number;
	subtext: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
	return (
		<div className="rounded-xl border border-graphite bg-charcoal p-5 shadow-[var(--shadow-inset)]">
			<div className="flex items-center justify-between text-fog">
				<span className="font-inter text-xs font-[510] text-mist">{label}</span>
				<Icon size={16} className="text-fog" />
			</div>
			<p className="mt-3 font-inter text-2xl font-light text-snow">{value}</p>
			<p className="mt-1 font-inter text-[11px] text-fog truncate">{subtext}</p>
		</div>
	);
}
