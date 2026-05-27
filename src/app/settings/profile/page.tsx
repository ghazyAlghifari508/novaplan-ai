import { requireAuth, getUserProfile, getUserPlan } from "@/lib/auth";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function ProfilePage() {
  const user = await requireAuth();
  const profile = await getUserProfile();
  const plan = await getUserPlan();

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] p-6"
      style={{ background: "var(--bg-elevated)" }}
    >
      <h2 className="mb-6 font-fustat text-xl font-bold" style={{ color: "var(--text-primary)" }}>Edit Profil</h2>
      <ProfileForm
        profile={{
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          email: user.email!,
          plan,
        }}
      />
    </div>
  );
}