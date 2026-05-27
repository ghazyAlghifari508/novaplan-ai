import { requireAuth } from "@/lib/auth";
import { AccountForm } from "@/components/settings/account-form";

export default async function AccountPage() {
  const user = await requireAuth();

  return (
    <div className="rounded-xl border border-border-subtle dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6">
      <h2 className="mb-6 font-fustat text-xl font-bold">Pengaturan Akun</h2>
      <AccountForm email={user.email!} />
    </div>
  );
}