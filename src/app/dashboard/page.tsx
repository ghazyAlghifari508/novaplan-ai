import { requireAuth, getUserProfile } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const profile = await getUserProfile();

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-fustat text-3xl font-bold">
            Halo, {profile?.full_name || user.email}
          </h1>
          <p className="mt-2 text-text-gray">Selamat datang di NovaPlan Dashboard</p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-gray transition-colors hover:bg-light-gray-bg"
          >
            Logout
          </button>
        </form>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <div className="mb-2 text-sm text-text-gray">Plan Aktif</div>
          <div className="font-fustat text-2xl font-semibold capitalize">
            Gratis
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <div className="mb-2 text-sm text-text-gray">PRD Bulan Ini</div>
          <div className="font-fustat text-2xl font-semibold">0 / 3</div>
        </div>

        <Link
          href="/"
          className="rounded-xl border-2 border-dashed border-border-subtle bg-light-gray-bg p-6 transition-all hover:border-primary-black/20 hover:bg-white"
        >
          <div className="text-sm text-text-gray">+ Buat PRD Baru</div>
          <div className="mt-1 font-fustat text-lg font-semibold">
            Mulai chat dengan AI
          </div>
        </Link>
      </div>
    </div>
  );
}