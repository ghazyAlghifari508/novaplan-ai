import { createFileRoute } from "@tanstack/react-router";
import { listFeedback, listErrorReports } from "@/lib/services/admin-service";

export const Route = createFileRoute("/admin/feedback")({
  loader: async () => ({ feedback: await listFeedback({ data: {} }), errors: await listErrorReports() }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { feedback, errors } = Route.useLoaderData();
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xl font-semibold">Feedback</h2>
        {feedback.map((f) => (
          <div key={f.id} className="rounded-lg border border-graphite bg-charcoal p-3 text-sm">
            <span className="text-fog">[{f.type}]</span> {f.message}
          </div>
        ))}
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold">Error Reports</h2>
        {errors.map((e) => (
          <div key={e.id} className="rounded-lg border border-graphite bg-charcoal p-3 text-sm">
            {e.errorMessage}
          </div>
        ))}
      </section>
    </div>
  );
}
