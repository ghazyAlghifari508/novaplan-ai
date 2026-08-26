import { createFileRoute } from "@tanstack/react-router";
import { listUsers, updateUserPlan, setUserBanned, resetUserCredit, setUserAdmin } from "@/lib/services/admin-service";

export const Route = createFileRoute("/admin/users")({
  loader: async () => ({ rows: await listUsers() }),
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
                <button onClick={() => updateUserPlan(user.id, "pro")}>Pro</button>
                <button onClick={() => updateUserPlan(user.id, "hengker")}>Hengker</button>
                <button onClick={() => setUserBanned(user.id, !user.bannedAt)}>{user.bannedAt ? "Aktifkan" : "Ban"}</button>
                <button onClick={() => resetUserCredit(user.id)}>Reset Credit</button>
                <button onClick={() => setUserAdmin(user.id, !user.isAdmin)}>Toggle Admin</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
