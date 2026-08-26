import { createFileRoute } from "@tanstack/react-router";
import { countUsers, listFeedback, listErrorReports } from "@/lib/services/admin-service";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const [userCount, feedback, errors] = await Promise.all([countUsers(), listFeedback({ data: {} }), listErrorReports()]);
    return { userCount, feedbackCount: feedback.length, errorCount: errors.length };
  },
  component: Dashboard,
});

function Dashboard() {
  const { userCount, feedbackCount, errorCount } = Route.useLoaderData();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Users" value={userCount} />
      <StatCard label="Feedback" value={feedbackCount} />
      <StatCard label="Error Reports" value={errorCount} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-graphite bg-charcoal p-6">
      <p className="text-sm text-fog">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
