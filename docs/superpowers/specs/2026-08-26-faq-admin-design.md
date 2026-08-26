# Spec: FAQ Page + Admin Panel (PrdFy)

**Date:** 2026-08-26
**Status:** Draft for review
**Author:** AI (brainstorming → spec)
**Scope:** Two features — (A) a static FAQ page (bounded), (B) an admin subsystem (architectural).

---

## 0. Context & Verified Facts

All claims below are grounded in the codebase (not assumed). Evidence:

| Fact | Evidence |
|---|---|
| Login is Google + GitHub OAuth only; password disabled | `src/lib/auth.ts:47-49` (`emailAndPassword.enabled:false`) |
| No admin plugin installed | `package.json` deps: only `better-auth@^1.6.25`, no `@better-auth/admin` |
| `users.role` is a job-title profile field, NOT authorization | `src/components/auth/onboarding-form.tsx:38,150`; `src/app/actions/settings.ts:22`; `src/lib/auth.ts:66` (`input:false`) |
| No user-facing admin guard exists | repo-wide grep (`src/**/*.ts`,`*.tsx`, `packages/cli`) for `requireAdmin\|is_admin\|isAdmin\|banUser\|ADMIN_EMAILS\|@better-auth/admin\|adminRole` → only API-key `"admin"` scope (`src/lib/api-key-auth.ts:68`, `src/routes/api/kanban/update-status.ts:47`), which is for API keys, not app users |
| Client session via `authClient.useSession()` | `src/components/layout/navbar.tsx:29` |
| `subscriptions` has `plan` (free/pro/hengker), `status`, `credits`, `creditsUsed` | `src/db/schema.ts:83-113` |
| Credit model uses write-on-read rollover | `src/lib/credits.ts:70 getCreditBalance`, `:135 consumeCredit`; `src/lib/billing.ts` |
| Feedback + error already collected | `feedback` (`src/db/schema.ts:302-312`, written by `src/routes/api/feedback.ts` with `type` general/bug/feature); `error_reports` (`src/db/schema.ts:315-325`) |
| Settings layout pattern to reuse | `src/components/settings/settings-client.tsx` (sidebar `NAV_ITEMS` + `aside`/`main`) |
| `.env.example` documents all env vars (no hardcoding) | `.env.example` |
| No accordion component / no `@radix-ui/react-accordion` | glob `src/components/ui/*` (only dialog, dropdown-menu, slot) |

### Better Auth verification (via Context7, `/better-auth/better-auth` v1.6.x)

1. **`databaseHooks.session.create.after` exists** — type def includes `session?: { create?: { before/after } }`. `after` is side-effect only (returns void); `user.create.before` can mutate the user row. → Used for auto-promoting admin on login.
2. **Ban without admin plugin** — the admin plugin's `ban-user`/`revoke-user-sessions` are plugin-only and bring their own `role` model (conflicts with our `users.role` job-title). Instead: add `banned_at` column, enforce in `requireUser`, and revoke sessions via our **own** `sessions` table (`src/db/schema.ts:34`) with `db.delete(sessions).where(eq(sessions.userId, id))`. No Better Auth internals needed.
3. **`additionalFields` reach the client** — docs: "All additional fields are properly inferred and available on the server and client side." So `is_admin` declared as an `additionalField` appears in `session.user` via `authClient.useSession()`. For TS types, add `customSessionClient<typeof auth>()` to `src/lib/auth-client.ts`.

---

## A. FAQ Page (bounded)

### A.1 Goal
A public, static FAQ page in Bahasa Indonesia, styled like the rest of the app, reachable from the footer (and mobile nav). No backend, no DB.

### A.2 Approach
- New route `src/routes/faq.tsx` (path `/faq`), mirroring `src/routes/about.tsx` + the `island-shell` / `page-wrap` containers.
- FAQ content lives in a **constants module** `src/components/faq/faq-data.ts` (NOT inline magic strings — Rule no-hardcode: business content in a constants file). Shape:
  ```ts
  export interface FaqItem { q: string; a: string }
  export interface FaqCategory { id: string; title: string; items: FaqItem[] }
  export const FAQ_CATEGORIES: FaqCategory[] = [ /* Akun & Login, Credit & Paket, Cara Kerja PrdFy, Pembayaran & Top-up, Lainnya */ ];
  ```
- Render as an **accessible accordion using native `<details>/<summary>`** (zero new dependencies). Optional: a client-side text filter input that shows/hides items by matching `q`/`a`.
- Link placement:
  - `src/components/layout/footer.tsx` — add a `<Link to="/faq">FAQ</Link>` next to the existing Pricing link.
  - `src/components/layout/navbar.tsx` mobile drawer — add FAQ link alongside Home/Pricing/History/Settings.

### A.3 Files touched
- `src/routes/faq.tsx` (new)
- `src/components/faq/faq-data.ts` (new)
- `src/components/faq/faq.tsx` (new — presentational component) — optional split from route
- `src/components/layout/footer.tsx` (edit)
- `src/components/layout/navbar.tsx` (edit, mobile drawer)

### A.4 Testing
- Manual: visit `/faq`, expand/collapse items, filter works, footer + mobile links navigate correctly.
- (Optional) Vitest for the filter matcher logic if implemented.

---

## B. Admin Panel (architectural)

### B.1 Goal
A minimal admin subsystem so the app owner (`alghifarighazy508@gmail.com`) can:
- see a user list, upgrade/downgrade plan, ban/activate users, reset credits, toggle admin;
- read user feedback (bug reports, feature requests) and client error reports.

Admin is just an OAuth user (Google/GitHub) whose email is listed in `ADMIN_EMAILS`. No separate login, no password.

### B.2 Data model changes (`src/db/schema.ts`)
1. `users.is_admin` — `boolean("is_admin").notNull().default(false)`.
2. `users.banned_at` — `timestamp("banned_at")` (nullable).
3. Declare `is_admin` (and keep existing `role`, `fullName`, `company`) in `auth.ts` `user.additionalFields` so it serializes to the session:
   ```ts
   user: { additionalFields: {
     fullName: { type: "string", required: false, input: true },
     company: { type: "string", required: false, input: true },
     role: { type: "string", required: false, input: false },
     is_admin: { type: "boolean", required: false, input: false, defaultValue: false },
   }}
   ```
   - **Migration:** `pnpm db:generate` then `pnpm db:migrate` (or `pnpm db:push` for local). New columns are nullable/additive → backward compatible.

### B.3 Bootstrap admin (`ADMIN_EMAILS` env)
- Add to `.env.example`:
  ```
  # Comma-separated emails that are auto-promoted to admin on login
  ADMIN_EMAILS="alghifarighazy508@gmail.com"
  ```
- In `src/lib/auth.ts`, add `databaseHooks.session.create.after` (verified exists):
  ```ts
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  // inside databaseHooks.session.create.after:
  if (ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    await db.update(users).set({ is_admin: true }).where(eq(users.id, session.user.id));
  }
  ```
- Exact email match required. Covers both new signups and already-registered admins (promotes on next login). No seed script needed.
- **Security:** `ADMIN_EMAILS` from env only; OAuth provider email is trusted/verified. No self-promote UI.

### B.4 Guard (`src/lib/session.ts`)
- Add `requireAdmin` (mirror `requireUser` at `src/lib/session.ts:29`):
  ```ts
  export const requireAdmin = createServerOnlyFn(async (headers?: Headers) => {
    const h = headers ?? (await getRequestHeadersServer());
    const session = await getSessionFromHeaders(h);
    if (!session?.user) throw new Error("Unauthorized");
    if (!session.user.is_admin) throw new Error("Forbidden");
    return session.user;
  });
  ```
- Extend `requireUser` to reject banned users: after `getSessionFromHeaders`, if `session.user.banned_at` is set → throw `Error("Unbidden")` (blocks all app access; enforced everywhere because every guarded server fn calls `requireUser`).

### B.5 Navbar entry (`src/components/layout/navbar.tsx`)
- In the profile dropdown (`navbar.tsx:310-345`), conditionally render an "Admin" item (icon `Shield` from `lucide-react`, already imported there) when `session.user.is_admin` is true, linking to `/admin`.
- Same conditional in the mobile drawer if desired.

### B.6 Routes & UI (reuse `settings-client.tsx` layout)
- `src/routes/admin.tsx` — layout route using a new `AdminClient` (copy the sidebar pattern from `settings-client.tsx:21-89` with `NAV_ITEMS = [{href:"/admin", label:"Dashboard"}, {href:"/admin/users", label:"Users"}, {href:"/admin/feedback", label:"Feedback"}]`). `beforeLoad` calls `requireAdminServer` (or redirects to `/login`).
- `src/routes/admin/index.tsx` — dashboard: counts (users, projects, feedback, error_reports, recent payments).
- `src/routes/admin/users.tsx` — table of users (email, name, plan, credits remaining, status, is_admin) with row actions.
- `src/routes/admin/feedback.tsx` — list `feedback` + `error_reports`, filterable by `type` (general/bug/feature).

### B.7 Server functions (all guarded by `requireAdmin`; DB via dynamic import per `session.ts` pattern)
- `listUsers(opts)` — paginated users join latest `subscriptions` for plan/credits.
- `updateUserPlan(userId, plan)` — update `subscriptions.plan` + `status` on the active row (`src/db/schema.ts:83-113`). Plan values: `free|pro|hengker`.
- `setUserBanned(userId, banned)` — set `banned_at`; when banning, also `db.delete(sessions).where(eq(sessions.userId, userId))` to revoke all sessions (our own `sessions` table).
- `resetUserCredit(userId)` — set `creditsUsed = 0` on the active subscription row. **Open item:** must respect the write-on-read rollover in `src/lib/credits.ts` (verify exact behavior during implementation; may need to call a credits helper rather than raw update to avoid breaking the rollover contract).
- `setUserAdmin(userId, isAdmin)` — set `users.is_admin`.
- `listFeedback(opts)` / `listErrorReports(opts)` — read `feedback` / `error_reports`.

### B.8 Admin client components (`src/components/admin/*`)
- `admin-client.tsx` (sidebar layout, mirrors `settings-client.tsx`)
- `users-table.tsx` (table + action buttons/dialogs)
- `feedback-list.tsx`
- `dashboard.tsx`

### B.9 Security notes
- All admin server fns throw if not `requireAdmin`.
- `setUserBanned`/`setUserAdmin` are destructive → confirm dialog in UI; server-side re-checks `requireAdmin`.
- No admin role exposed to non-admins; `is_admin` is `input:false` so clients cannot set it.
- Ban enforcement in `requireUser` protects every existing guarded endpoint.

### B.10 Testing
- Unit (Vitest, per existing `*.test.ts` convention):
  - `requireAdmin` → normal user throws `Forbidden`, admin passes.
  - `requireUser` → banned user throws.
  - `listUsers` / `updateUserPlan` against a test DB or mocked db.
- Manual: log in as `alghifarighazy508@gmail.com` → "Admin" menu appears; non-admin login → `/admin` redirects; ban a test user → they are logged out and blocked; reset credit reflects in their balance.

---

## C. Open items (resolve during implementation, not blocking spec)
1. `resetUserCredit` interaction with `src/lib/credits.ts` rollover — confirm whether a raw `creditsUsed=0` update is safe or a credits helper is required.
2. `customSessionClient<typeof auth>()` addition to `src/lib/auth-client.ts` for proper TS inference of `session.user.is_admin` (runtime already works without it).
3. Whether feedback list needs a "mark resolved" state — out of scope for v1 (read-only view).

## D. Out of scope (v1)
- Project moderation (delete/hide projects).
- Impersonation.
- Admin plugin adoption (conflicts with `users.role` job-title).
- Editable FAQ via CMS.
