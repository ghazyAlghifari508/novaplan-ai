"use client";

import Link from "next/link";

interface AnalyticsData {
  totalPrds: number;
  totalVersions: number;
  avgVersionsPerPrd: number;
  mostRevisedPrd: { name: string; versions: number; id: string } | null;
  completedCount: number;
  draftCount: number;
}

export function AnalyticsSection({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          HENGKER
        </span>
        <h3 className="font-fustat text-base font-bold text-purple-900">Analytics</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-3">
          <div className="text-xs text-text-gray">Total PRDs</div>
          <div className="mt-1 font-fustat text-xl font-bold">{analytics.totalPrds}</div>
        </div>

        <div className="rounded-lg bg-white p-3">
          <div className="text-xs text-text-gray">Total Versions</div>
          <div className="mt-1 font-fustat text-xl font-bold">{analytics.totalVersions}</div>
        </div>

        <div className="rounded-lg bg-white p-3">
          <div className="text-xs text-text-gray">Rata-rata Revisi/PRD</div>
          <div className="mt-1 font-fustat text-xl font-bold">
            {analytics.avgVersionsPerPrd.toFixed(1)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-3">
          <div className="text-xs text-text-gray">Completion Rate</div>
          <div className="mt-1 font-fustat text-xl font-bold">
            {analytics.totalPrds > 0
              ? Math.round((analytics.completedCount / analytics.totalPrds) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {analytics.mostRevisedPrd && (
        <div className="mt-4 rounded-lg border border-purple-200 bg-white p-3">
          <div className="text-xs text-text-gray">Most Revised PRD</div>
          <Link
            href={`/prd/${analytics.mostRevisedPrd.id}`}
            className="mt-1 flex items-center gap-2 text-sm font-medium text-primary-black hover:text-purple-600"
          >
            {analytics.mostRevisedPrd.name}
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              {analytics.mostRevisedPrd.versions} versions
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}