"use client";

import { useState, useTransition } from "react";
import { StatsBar } from "./stats-bar";
import { PrdCard } from "./prd-card";
import { FilterBar } from "./filter-bar";
import { AnalyticsSection } from "./analytics-section";
import { FEATURES } from "@/types/database";
import type { Plan } from "@/types/database";
import Link from "next/link";
import { FileText } from "lucide-react";

interface DashboardClientProps {
  userEmail: string;
  userName: string | null | undefined;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }>;
  quota: {
    prd_used: number;
    prd_limit: number;
    plan: string;
    reset_at: string | null;
  } | null;
  plan: Plan;
  analytics?: {
    totalPrds: number;
    totalVersions: number;
    avgVersionsPerPrd: number;
    mostRevisedPrd: { name: string; versions: number; id: string } | null;
    completedCount: number;
    draftCount: number;
  };
}

export function DashboardClient({
  userEmail,
  userName,
  projects: initialProjects,
  quota,
  plan,
  analytics,
}: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [isPending, startTransition] = useTransition();

  const filtered = initialProjects.filter((p) => {
    if (filter === "draft" && p.status !== "draft") return false;
    if (filter === "completed" && p.status !== "completed") return false;
    if (filter === "archived" && p.status !== "archived") return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "recent") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sort === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    if (sort === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const stats = {
    total: initialProjects.length,
    drafts: initialProjects.filter((p) => p.status === "draft").length,
    completed: initialProjects.filter((p) => p.status === "completed").length,
    quotaUsed: quota?.prd_used ?? 0,
    quotaLimit: quota?.prd_limit ?? 0,
    plan: quota?.plan ?? "free",
  };

  const showAnalytics = FEATURES[plan].apiAccess && analytics;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-fustat text-3xl font-bold">
            Halo, {userName || userEmail.split("@")[0]}
          </h1>
          <p className="mt-1 text-text-gray">Manage semua PRD kamu</p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-text-gray"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v12M2 8h12" strokeLinecap="round" />
          </svg>
          Buat PRD Baru
        </Link>
      </div>

      <StatsBar stats={stats} />

      {showAnalytics && (
        <div className="mb-6">
          <AnalyticsSection analytics={analytics} />
        </div>
      )}

      <FilterBar
        search={search}
        setSearch={(v) => startTransition(() => setSearch(v))}
        filter={filter}
        setFilter={(v) => startTransition(() => setFilter(v))}
        sort={sort}
        setSort={(v) => startTransition(() => setSort(v))}
      />

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-text-gray/50">
          <FileText size={64} strokeWidth={1} />
          <h2 className="mt-6 font-fustat text-2xl font-bold text-primary-black">
            {search || filter !== "all"
              ? "Tidak ada PRD ditemukan"
              : "Belum ada PRD"}
          </h2>
          <p className="mt-2 max-w-sm text-text-gray">
            {search || filter !== "all"
              ? "Coba ubah filter atau kata kunci pencarian"
              : "Mulai buat PRD pertamamu sekarang. Describe produkmu dan AI akan generate PRD dalam 5 menit."}
          </p>
          {!search && filter === "all" && (
            <Link
              href="/dashboard/chat"
              className="mt-6 inline-flex rounded-xl bg-primary-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-text-gray"
            >
              Buat PRD Pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <PrdCard
              key={project.id}
              id={project.id}
              name={project.name}
              status={project.status}
              description={project.description}
              updatedAt={project.updated_at}
            />
          ))}
        </div>
      )}

      {isPending && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32">
          <div className="rounded-full bg-primary-black px-4 py-2 text-xs text-white shadow-lg">
            Filtering...
          </div>
        </div>
      )}
    </div>
  );
}