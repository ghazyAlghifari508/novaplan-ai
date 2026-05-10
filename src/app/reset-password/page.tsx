import { ResetPasswordForm } from "@/components/auth";
import { requireAuth } from "@/lib/auth";

export default async function ResetPasswordPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <ResetPasswordForm />
    </div>
  );
}