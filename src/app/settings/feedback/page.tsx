import { requireAuth } from "@/lib/auth";
import { FeedbackForm } from "@/components/settings/feedback-form";

export default async function FeedbackPage() {
  await requireAuth();

  return (
    <div className="rounded-xl border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6">
      <h2 className="mb-6 font-fustat text-xl font-bold">Feedback & Bug Report</h2>
      <p className="mb-6 text-sm text-text-gray dark:text-[#A0A0A0]">
        Bantu kami meningkatkan NovaPlan dengan memberikan feedback, melaporkan bug,
        atau meminta fitur baru.
      </p>
      <FeedbackForm />
    </div>
  );
}