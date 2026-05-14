import { cn } from "@/lib/utils";
import { Infinity as InfinityIcon } from "lucide-react";

interface Stats {
  total: number;
  drafts: number;
  completed: number;
  quotaUsed: number;
  quotaLimit: number;
  plan: string;
}

export function StatsBar({ stats }: { stats: Stats }) {
  const quotaPercent =
    stats.quotaLimit === -1 ? 0 : Math.round((stats.quotaUsed / stats.quotaLimit) * 100);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <div className="text-xs text-text-gray">Total PRD</div>
        <div className="mt-1 font-fustat text-2xl font-bold">{stats.total}</div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <div className="text-xs text-text-gray">Draft</div>
        <div className="mt-1 font-fustat text-2xl font-bold">{stats.drafts}</div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <div className="text-xs text-text-gray">Selesai</div>
        <div className="mt-1 font-fustat text-2xl font-bold">{stats.completed}</div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-gray">Quota Bulan Ini</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              stats.plan === "hengker" && "bg-purple-100 text-purple-700",
              stats.plan === "pro" && "bg-blue-100 text-blue-700",
              stats.plan === "free" && "bg-light-gray-bg text-text-gray",
            )}
          >
            {stats.plan}
          </span>
        </div>
        <div className="mt-1 font-fustat text-2xl font-bold flex items-center h-8">
          {stats.quotaLimit === -1
            ? <InfinityIcon size={24} className="stroke-[3]" />
            : `${stats.quotaUsed} / ${stats.quotaLimit}`}
        </div>
        {stats.quotaLimit !== -1 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-light-gray-bg">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                quotaPercent > 80
                  ? "bg-red-500"
                  : quotaPercent > 50
                    ? "bg-yellow-500"
                    : "bg-accent-green",
              )}
              style={{ width: `${Math.min(quotaPercent, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}