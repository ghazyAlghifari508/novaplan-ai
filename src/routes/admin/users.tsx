import { createFileRoute } from "@tanstack/react-router";
import { listUsers, updateUserPlan, setUserBanned, resetUserCredit, setUserAdmin } from "@/lib/services/admin-service";

export const Route = createFileRoute("/admin/users")({
  loader: async () => ({ rows: await listUsers({ data: {} }) }),
  component: UsersPage,
});

function UsersPage() {
  const { rows } = Route.useLoaderData();
  return (
    <div className="rounded-xl border border-graphite bg-charcoal p-6">
      <table className="w-full text-left text-sm">
        <thead><tr><th>Email</th><th>Plan</th><th>Admin</th><th>Aksi</th></tr></thead>
        <tbody>
          {rows.map(({ user, sub }) => (
            <tr key={user.id} className="border-t border-graphite">
              <td>{user.email}</td>
              <td>{sub?.plan ?? "free"}</td>
              <td>{user.isAdmin ? "Ya" : "Tidak"}</td>
              <td className="flex gap-2">
                <button onClick={async () => { await updateUserPlan({ data: { userId: user.id, plan: "pro" } }); window.location.reload(); }}>Pro</button>
                <button onClick={async () => { await updateUserPlan({ data: { userId: user.id, plan: "hengker" } }); window.location.reload(); }}>Hengker</button>
                <button onClick={async () => { await setUserBanned({ data: { userId: user.id, banned: !user.bannedAt } }); window.location.reload(); }}>{user.bannedAt ? "Aktifkan" : "Ban"}</button>
                <button onClick={async () => { await resetUserCredit({ data: { userId: user.id } }); window.location.reload(); }}>Reset Credit</button>
                <button onClick={async () => { await setUserAdmin({ data: { userId: user.id, isAdmin: !user.isAdmin } }); window.location.reload(); }}>Toggle Admin</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
