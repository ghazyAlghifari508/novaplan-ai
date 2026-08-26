# Monthly Pricing (Subscription) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrasi pricing dari one-time ke langganan bulanan: kredit hangus per periode 30 hari, status `paused` saat masa aktif habis, cancel/renew manual, reminder email via Vercel Cron + Resend.

**Architecture:** Kolom periode nullable pada tabel `subscriptions` (NULL = legacy/grandfathered never-expire), evaluasi lazy di hot path `src/lib/credits.ts` (gating = fungsi murni dari waktu, tanpa cron untuk gating), logika murni diekstrak ke `src/lib/billing.ts` agar unit-testable tanpa DB, cron harian hanya untuk email.

**Tech Stack:** TanStack Start (file-based routing), Drizzle ORM + PostgreSQL 17, Midtrans Snap (existing), Resend (baru), Vitest, pnpm, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-08-25-monthly-pricing-design.md` — baca dulu sebelum eksekusi.

## Global Constraints

- TanStack Start file-based routing di `src/routes/`. Bukan Next.js. Jangan import `next/*`.
- Server-only (`db`, `pg`, `auth`, email SDK): dynamic import di dalam handler / `createServerFn`. Jangan top-level di module yang di-import client.
- `src/lib/billing.ts` HARUS pure (zero import `@/db`) — seluruh testable logic hidup di sini.
- 1 credit = 1 generate. Revision free unlimited. Jangan sentuh gate revision.
- No hardcode: durasi periode/jadwal reminder di `src/lib/constants.ts`; secret di env var.
- UI copy & email Bahasa Indonesia; istilah teknis English. Commit message English.
- `consumeCredit` tetap atomic single-statement (predikat di WHERE).
- Verify commands per task: `pnpm vitest run <file>` (unit), `pnpm exec tsc --noEmit` (types), `pnpm check` (biome). Suite penuh: `pnpm vitest run`.
- Grandfathering: row dengan `current_period_end IS NULL` berperilaku persis seperti hari ini. Regression test existing tidak boleh rusak.

---

### Task 1: Billing core — konstanta + modul pure `src/lib/billing.ts`

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/lib/billing.ts`
- Test: `src/lib/billing.test.ts`

**Interfaces:**
- Consumes: `PLAN_CREDITS`, `type Plan` dari `@/types/database`.
- Produces (dipakai semua task berikutnya):
  - `type SubscriptionStateKind = "free_active" | "legacy_grandfathered" | "active_paid" | "paused"`
  - `interface EffectiveSubscription { state: SubscriptionStateKind; effectivePlan: Plan; remaining: number; currentPeriodEnd: Date | null }`
  - `interface SubscriptionRowLike { plan: string | null; status: string | null; credits: number | null; creditsUsed: number | null; currentPeriodStart: Date | null; currentPeriodEnd: Date | null; cancelledAt?: Date | null }`
  - `resolveSubscriptionState(sub: SubscriptionRowLike | undefined, now: Date): EffectiveSubscription`
  - `isFreeRolloverDue(sub: SubscriptionRowLike | undefined, now: Date): boolean`
  - `computeFreeRolloverPeriod(now: Date): { start: Date; end: Date }`
  - `computePurchaseGrant(params: { plan: Plan; now: Date; activePeriodEnd: Date | null }): { periodStart: Date; periodEnd: Date; credits: number }`
  - `addDays(date: Date, days: number): Date`
  - `normalizePlan(raw: string | null | undefined): Plan`
  - Konstanta: `BILLING_PERIOD_DAYS = 30`, `PRE_EXPIRY_NOTICE_DAYS = 3`, `REMINDER_SCHEDULE_DAYS = [1, 7, 14]`

- [ ] **Step 1: Tulis test yang gagal**

Buat `src/lib/billing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	addDays,
	computeFreeRolloverPeriod,
	computePurchaseGrant,
	isFreeRolloverDue,
	resolveSubscriptionState,
	type SubscriptionRowLike,
} from "./billing";

const NOW = new Date("2026-08-25T00:00:00Z");

function row(overrides: Partial<SubscriptionRowLike> = {}): SubscriptionRowLike {
	return {
		plan: "pro",
		status: "active",
		credits: 30,
		creditsUsed: 5,
		currentPeriodStart: addDays(NOW, -10),
		currentPeriodEnd: addDays(NOW, 20),
		cancelledAt: null,
		...overrides,
	};
}

describe("resolveSubscriptionState", () => {
	it("undefined row -> free_active with zero credits", () => {
		const eff = resolveSubscriptionState(undefined, NOW);
		expect(eff.state).toBe("free_active");
		expect(eff.effectivePlan).toBe("free");
		expect(eff.remaining).toBe(0);
	});

	it("free row -> free_active with prorated remaining", () => {
		const eff = resolveSubscriptionState(
			row({ plan: "free", credits: 2, creditsUsed: 1 }),
			NOW,
		);
		expect(eff.state).toBe("free_active");
		expect(eff.effectivePlan).toBe("free");
		expect(eff.remaining).toBe(1);
	});

	it("cancelled row -> treated as free_active", () => {
		const eff = resolveSubscriptionState(row({ cancelledAt: NOW }), NOW);
		expect(eff.state).toBe("free_active");
		expect(eff.effectivePlan).toBe("free");
	});

	it("paid row with NULL period -> legacy_grandfathered (never expires)", () => {
		const eff = resolveSubscriptionState(row({ currentPeriodEnd: null }), NOW);
		expect(eff.state).toBe("legacy_grandfathered");
		expect(eff.effectivePlan).toBe("pro");
		expect(eff.remaining).toBe(25);
	});

	it("paid row within period -> active_paid", () => {
		const eff = resolveSubscriptionState(row(), NOW);
		expect(eff.state).toBe("active_paid");
		expect(eff.effectivePlan).toBe("pro");
		expect(eff.remaining).toBe(25);
	});

	it("boundary: now === period_end is still active (inclusive)", () => {
		const eff = resolveSubscriptionState(
			row({ currentPeriodEnd: new Date(NOW) }),
			NOW,
		);
		expect(eff.state).toBe("active_paid");
	});

	it("expired paid row -> paused: effectivePlan free, remaining forced 0", () => {
		const eff = resolveSubscriptionState(
			row({ currentPeriodEnd: addDays(NOW, -3) }),
			NOW,
		);
		expect(eff.state).toBe("paused");
		expect(eff.effectivePlan).toBe("free");
		expect(eff.remaining).toBe(0);
	});

	it("unknown plan string normalizes to free", () => {
		const eff = resolveSubscriptionState(row({ plan: "vip" }), NOW);
		expect(eff.state).toBe("free_active");
	});
});

describe("isFreeRolloverDue", () => {
	it("true for free row without period (legacy)", () => {
		expect(isFreeRolloverDue(row({ plan: "free", currentPeriodEnd: null }), NOW)).toBe(true);
	});

	it("true for free row with expired period", () => {
		expect(isFreeRolloverDue(row({ plan: "free", currentPeriodEnd: addDays(NOW, -1) }), NOW)).toBe(true);
	});

	it("false for free row with active period", () => {
		expect(isFreeRolloverDue(row({ plan: "free", currentPeriodEnd: addDays(NOW, 5) }), NOW)).toBe(false);
	});

	it("false for paid rows even when expired", () => {
		expect(isFreeRolloverDue(row({ currentPeriodEnd: addDays(NOW, -5) }), NOW)).toBe(false);
	});
});

describe("computeFreeRolloverPeriod", () => {
	it("spans exactly BILLING_PERIOD_DAYS from now", () => {
		const p = computeFreeRolloverPeriod(NOW);
		expect(p.end.getTime() - p.start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
		expect(p.start.getTime()).toBe(NOW.getTime());
	});
});

describe("computePurchaseGrant", () => {
	it("fresh purchase starts now", () => {
		const g = computePurchaseGrant({ plan: "pro", now: NOW, activePeriodEnd: null });
		expect(g.credits).toBe(30);
		expect(g.periodStart.getTime()).toBe(NOW.getTime());
		expect(g.periodEnd.getTime()).toBe(addDays(NOW, 30).getTime());
	});

	it("early renewal extends from current period end (additive)", () => {
		const futureEnd = addDays(NOW, 20);
		const g = computePurchaseGrant({ plan: "hengker", now: NOW, activePeriodEnd: futureEnd });
		expect(g.credits).toBe(105);
		expect(g.periodEnd.getTime()).toBe(addDays(futureEnd, 30).getTime());
	});

	it("renewal while paused/expired starts now", () => {
		const pastEnd = addDays(NOW, -4);
		const g = computePurchaseGrant({ plan: "pro", now: NOW, activePeriodEnd: pastEnd });
		expect(g.periodEnd.getTime()).toBe(addDays(NOW, 30).getTime());
	});
});

describe("addDays", () => {
	it("adds calendar-equivalent days in UTC ms", () => {
		expect(addDays(new Date("2026-01-01T00:00:00Z"), 2).toISOString()).toBe("2026-01-03T00:00:00Z");
	});
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `pnpm vitest run src/lib/billing.test.ts`
Expected: FAIL — `Cannot find module './billing'`

- [ ] **Step 3: Tambahkan konstanta billing di `src/lib/constants.ts`**

Tambahkan di akhir file (setelah `KANBAN_POLL_INTERVAL_MS`):

```ts
// === Billing (monthly subscription) ===
// Length of one paid/free billing period. All period math lives in lib/billing.ts.
export const BILLING_PERIOD_DAYS = 30;
// Days before period end when the pre-expiry notice email fires (cron job).
export const PRE_EXPIRY_NOTICE_DAYS = 3;
// Post-expiry pause reminder schedule, in days after the period ended.
// reminder_count tracks how many of these have been sent (see lib/services/billing-emails.ts).
export const REMINDER_SCHEDULE_DAYS = [1, 7, 14] as const;
```

- [ ] **Step 4: Buat `src/lib/billing.ts`**

```ts
/**
 * Pure billing-period logic for the monthly subscription model.
 *
 * ponytail: zero `@/db` imports here — this module runs in vitest without a
 * database and may be imported by any server module that needs to classify a
 * subscription row. DB access stays in credits.ts / payment-service.ts /
 * billing-emails.ts.
 *
 * Core rule (spec §5): access is a pure function of `now` vs
 * `current_period_end`. A NULL period on a paid row means legacy
 * grandfathering (one-time purchase, credits never expire). A NULL period on
 * a free row is rolled forward lazily by getCreditBalance.
 */
import { BILLING_PERIOD_DAYS } from "@/lib/constants";
import { PLAN_CREDITS, type Plan } from "@/types/database";

/** Minimal shape any caller's Drizzle select must provide. */
export interface SubscriptionRowLike {
	plan: string | null;
	status: string | null;
	credits: number | null;
	creditsUsed: number | null;
	currentPeriodStart: Date | null;
	currentPeriodEnd: Date | null;
	cancelledAt?: Date | null;
}

export type SubscriptionStateKind =
	| "free_active"
	| "legacy_grandfathered"
	| "active_paid"
	| "paused";

export interface EffectiveSubscription {
	state: SubscriptionStateKind;
	/** What FEATURES / rate-limit tiers should consult. */
	effectivePlan: Plan;
	/** Burnable credits right now. Forced 0 while paused (leftovers are forfeited). */
	remaining: number;
	currentPeriodEnd: Date | null;
}

export function normalizePlan(raw: string | null | undefined): Plan {
	return raw === "pro" || raw === "hengker" ? raw : "free";
}

/** Plain UTC-ms day math — periods are server-side UTC boundaries (spec §9). */
export function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function resolveSubscriptionState(
	sub: SubscriptionRowLike | undefined,
	now: Date,
): EffectiveSubscription {
	const plan = normalizePlan(sub?.plan);
	const credits = sub?.credits ?? 0;
	const creditsUsed = sub?.creditsUsed ?? 0;
	const periodEnd = sub?.currentPeriodEnd ?? null;
	const leftover = Math.max(0, credits - creditsUsed);

	if (!sub || plan === "free" || sub.cancelledAt != null) {
		return {
			state: "free_active",
			effectivePlan: "free",
			remaining: leftover,
			currentPeriodEnd: periodEnd,
		};
	}

	// Legacy one-time purchase: no period columns ever written.
	if (periodEnd == null) {
		return {
			state: "legacy_grandfathered",
			effectivePlan: plan,
			remaining: leftover,
			currentPeriodEnd: null,
		};
	}

	if (now.getTime() <= periodEnd.getTime()) {
		return {
			state: "active_paid",
			effectivePlan: plan,
			remaining: leftover,
			currentPeriodEnd: periodEnd,
		};
	}

	// Expired without renewal: leftovers forfeited, generation blocked.
	return {
		state: "paused",
		effectivePlan: "free",
		remaining: 0,
		currentPeriodEnd: periodEnd,
	};
}

/** True when a free row needs its monthly allocation refreshed (write-on-read). */
export function isFreeRolloverDue(
	sub: SubscriptionRowLike | undefined,
	now: Date,
): boolean {
	if (!sub || normalizePlan(sub.plan) !== "free") return false;
	const end = sub.currentPeriodEnd;
	return end == null || end.getTime() < now.getTime();
}

export function computeFreeRolloverPeriod(now: Date): {
	start: Date;
	end: Date;
} {
	return { start: now, end: addDays(now, BILLING_PERIOD_DAYS) };
}

/**
 * Grant produced by a purchase/renewal (spec §6.1):
 * - fresh/paused purchase -> period starts now;
 * - early renewal         -> extends from the still-active period end;
 * - credits are SET, never additive (monthly model).
 */
export function computePurchaseGrant(params: {
	plan: Plan;
	now: Date;
	activePeriodEnd: Date | null;
}): { periodStart: Date; periodEnd: Date; credits: number } {
	const anchor =
		params.activePeriodEnd &&
		params.activePeriodEnd.getTime() > params.now.getTime()
			? params.activePeriodEnd
			: params.now;
	return {
		periodStart: params.now,
		periodEnd: addDays(anchor, BILLING_PERIOD_DAYS),
		credits: PLAN_CREDITS[params.plan],
	};
}
```

- [ ] **Step 5: Jalankan test, pastikan PASS**

Run: `pnpm vitest run src/lib/billing.test.ts`
Expected: PASS (semua test hijau)

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing.ts src/lib/billing.test.ts src/lib/constants.ts
git commit -m "feat(billing): pure subscription-state core and billing constants"
```

---

### Task 2: Schema migration — kolom periode di `subscriptions`

**Files:**
- Modify: `src/db/schema.ts:83-104` (tabel `subscriptions`)
- Create: `drizzle/0008_*.sql` (hasil generator, nama acak)
- Modify: `src/lib/auth.ts:29-36` (signup seed)

**Interfaces:**
- Produces: kolom Drizzle `subscriptions.currentPeriodStart`, `subscriptions.currentPeriodEnd`, `subscriptions.cancelledAt`, `subscriptions.reminderCount` — dipakai Task 3, 4, 5, 12, 13.
- Migration non-breaking: semua kolom baru nullable kecuali `reminder_count` (NOT NULL DEFAULT 0 — aman untuk row existing).

- [ ] **Step 1: Edit definisi tabel di `src/db/schema.ts`**

Ganti blok kolom `subscriptions` (baris 85-97) menjadi:

```ts
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		plan: text("plan").notNull().default("free"), // free, pro, hengker
		status: text("status").notNull().default("active"),
		midtransOrderId: text("midtrans_order_id"),
		// Monthly model (spec §4): credits reset every period; leftover credits
		// are forfeited at period end. NULL period on a PAID row = legacy
		// one-time purchase (grandfathered, never expires). NULL on a FREE row
		// is initialized lazily by the write-on-read rollover in credits.ts.
		currentPeriodStart: timestamp("current_period_start"),
		currentPeriodEnd: timestamp("current_period_end"),
		cancelledAt: timestamp("cancelled_at"),
		// Email notification progress: 0 none, 1 = pre-expiry notice,
		// 2..4 = paused reminders D+1/D+7/D+14 (see billing-emails.ts).
		reminderCount: integer("reminder_count").notNull().default(0),
		credits: integer("credits").notNull().default(0),
		creditsUsed: integer("credits_used").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
```

(Index existing `(t)` array di bawahnya tidak berubah.)

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: file baru muncul di `drizzle/` (mis. `0008_*.sql`)

- [ ] **Step 3: Verifikasi isi SQL migration**

Buka file `drizzle/0008_*.sql` yang baru dibuat. Pastikan mengandung statement bertipe ini (nama snapshot acak):

```sql
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN "cancelled_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN "reminder_count" integer DEFAULT 0 NOT NULL;
```

Expected: hanya ALTER TABLE ADD COLUMN untuk tabel `subscriptions` (tidak ada DROP / data change).

- [ ] **Step 4: Apply migration ke DB lokal**

Run: `pnpm db:migrate`
Expected: sukses tanpa error.

- [ ] **Step 5: Update signup seed di `src/lib/auth.ts`**

Ganti isi hook `databaseHooks.user.create.after` (baris ~27-39):

```ts
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const { addDays } = await import("@/lib/billing");
					const { BILLING_PERIOD_DAYS } = await import("@/lib/constants");
					const now = new Date();
					await db.insert(subscriptions).values({
						id: crypto.randomUUID(),
						userId: user.id,
						plan: "free",
						status: "active",
						credits: PLAN_CREDITS.free,
						creditsUsed: 0,
						currentPeriodStart: now,
						currentPeriodEnd: addDays(now, BILLING_PERIOD_DAYS),
						reminderCount: 0,
					});
				},
			},
		},
	},
```

(Dynamic import menjaga konsistensi pola server-safe; `PLAN_CREDITS` sudah di-import top-level.)

- [ ] **Step 6: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: 0 error.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/lib/auth.ts drizzle/
git commit -m "feat(db): add billing period columns to subscriptions + periodic free signup seed"
```

---

### Task 3: Integrasi hot path — `src/lib/credits.ts`

**Files:**
- Modify: `src/lib/credits.ts` (seluruh file)

**Interfaces:**
- Consumes: `resolveSubscriptionState`, `isFreeRolloverDue`, `computeFreeRolloverPeriod`, `normalizePlan` dari `@/lib/billing` (Task 1).
- Produces:
  - `getCreditBalance(userId): Promise<CreditBalance>` dengan `CreditBalance = { plan: Plan; credits: number; creditsUsed: number; remaining: number; subscriptionState: SubscriptionStateKind; currentPeriodEnd: Date | null }`
  - `checkCredits(userId): Promise<{ allowed: boolean; remaining: number; plan: Plan; subscriptionState: SubscriptionStateKind }>`
  - `hasFullWorkflow(plan: Plan): boolean` — signature tetap.
  - `consumeCredit(userId): Promise<boolean>` — signature tetap, predikat periode ditambahkan.

Catatan: `PLAN_CREDITS` perlu di-import dari `@/types/database`. `normalizePlan` lokal dihapus (pakai versi billing). Logika rollover free adalah write-on-read idempotent (spec §5.3) — pure decision-nya sudah dites di Task 1; wiring ini diverifikasi tipe + suite.

- [ ] **Step 1: Tulis ulang `src/lib/credits.ts`**

```ts
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import {
	computeFreeRolloverPeriod,
	isFreeRolloverDue,
	resolveSubscriptionState,
	type SubscriptionStateKind,
	type SubscriptionRowLike,
} from "@/lib/billing";
import { FEATURES, PLAN_CREDITS, type Plan } from "@/types/database";

/** Hot-path payload consumed by /api/user/plan, chat.ts, ac/task generate. */
export interface CreditBalance {
	plan: Plan;
	credits: number;
	creditsUsed: number;
	remaining: number;
	subscriptionState: SubscriptionStateKind;
	currentPeriodEnd: Date | null;
}

/** AC / Task / Kanban access. Free tier is PRD-only. */
export function hasFullWorkflow(plan: Plan): boolean {
	return FEATURES[plan].fullWorkflow;
}

/**
 * Free-tier monthly refresh (spec §5.3): write-on-read, idempotent via the
 * predicate — two concurrent callers can only roll over once. Missed months
 * do not stack: one rollover jumps straight to a fresh period.
 */
async function rollOverFreeIfNeeded(
	row: SubscriptionRowLike & { id: string },
	now: Date,
): Promise<SubscriptionRowLike & { id: string }> {
	if (!isFreeRolloverDue(row, now)) return row;
	const period = computeFreeRolloverPeriod(now);
	const [updated] = await db
		.update(subscriptions)
		.set({
			currentPeriodStart: period.start,
			currentPeriodEnd: period.end,
			credits: PLAN_CREDITS.free,
			creditsUsed: 0,
			updatedAt: now,
		})
		.where(
			and(
				eq(subscriptions.id, row.id),
				or(
					isNull(subscriptions.currentPeriodEnd),
					lt(subscriptions.currentPeriodEnd, now),
				),
			),
		)
		.returning({
			id: subscriptions.id,
			plan: subscriptions.plan,
			status: subscriptions.status,
			credits: subscriptions.credits,
			creditsUsed: subscriptions.creditsUsed,
			currentPeriodStart: subscriptions.currentPeriodStart,
			currentPeriodEnd: subscriptions.currentPeriodEnd,
			cancelledAt: subscriptions.cancelledAt,
		});
	return updated ?? row;
}

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
	const [sub] = await db
		.select({
			id: subscriptions.id,
			plan: subscriptions.plan,
			status: subscriptions.status,
			credits: subscriptions.credits,
			creditsUsed: subscriptions.creditsUsed,
			currentPeriodStart: subscriptions.currentPeriodStart,
			currentPeriodEnd: subscriptions.currentPeriodEnd,
			cancelledAt: subscriptions.cancelledAt,
		})
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);

	// ponytail: fail closed - a missing row after the signup-seed hook means
	// something is wrong, not "give unlimited access".
	if (!sub) {
		return {
			plan: "free",
			credits: 0,
			creditsUsed: 0,
			remaining: 0,
			subscriptionState: "free_active",
			currentPeriodEnd: null,
		};
	}

	const now = new Date();
	const row = await rollOverFreeIfNeeded(sub, now);
	const eff = resolveSubscriptionState(row, now);

	return {
		plan: eff.effectivePlan,
		credits: row.credits ?? 0,
		creditsUsed: row.creditsUsed ?? 0,
		remaining: eff.remaining,
		subscriptionState: eff.state,
		currentPeriodEnd: eff.currentPeriodEnd,
	};
}

export async function checkCredits(
	userId: string,
): Promise<{
	allowed: boolean;
	remaining: number;
	plan: Plan;
	subscriptionState: SubscriptionStateKind;
}> {
	const { plan, remaining, subscriptionState } =
		await getCreditBalance(userId);
	return { allowed: remaining > 0, remaining, plan, subscriptionState };
}

/**
 * Atomically burns one credit. Two predicates live in the WHERE clause so two
 * concurrent project creations cannot overdraw, AND an expired (paused)
 * subscription can never burn its forfeited leftovers mid-expiry:
 * `current_period_end IS NULL` keeps legacy one-time rows burning forever.
 *
 * Returns false when there was nothing left to burn.
 */
export async function consumeCredit(userId: string): Promise<boolean> {
	const [latest] = await db
		.select({ id: subscriptions.id })
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);
	if (!latest) return false;

	const rows = await db
		.update(subscriptions)
		.set({
			creditsUsed: sql`${subscriptions.creditsUsed} + 1`,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(subscriptions.id, latest.id),
				sql`${subscriptions.creditsUsed} < ${subscriptions.credits}`,
				sql`(${subscriptions.currentPeriodEnd} IS NULL OR ${subscriptions.currentPeriodEnd} >= now())`,
			),
		)
		.returning({ id: subscriptions.id });

	return rows.length > 0;
}
```

- [ ] **Step 2: Verify types + suite**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm vitest run }`
Expected: tsc 0 error; seluruh suite PASS (termasuk `billing.test.ts`, `payment-service.test.ts`, `types/database.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/credits.ts
git commit -m "feat(billing): lazy period evaluation and free rollover in credit hot path"
```

---

### Task 4: `applyPaymentSuccess` — semantik monthly (SET, bukan aditif)

**Files:**
- Modify: `src/lib/services/payment-service.ts`

**Interfaces:**
- Consumes: `computePurchaseGrant` dari `@/lib/billing` (Task 1).
- Produces: `applyPaymentSuccess(orderId: string)` — signature & return `{ plan } | null` TETAP (dipakai webhook + syncPaymentStatus tanpa perubahan). Idempotency guard existing (`payment.status === "success"` bail + `SELECT ... FOR UPDATE`) dipertahankan apa adanya.

Aturan perilaku baru (spec §6.1): plan diset persis sesuai pembelian (ganti plan boleh, tanpa rank-guard), kredit SET ke alokasi plan, periode dari `computePurchaseGrant` (renew saat aktif = extend dari `period_end`), `cancelled_at`/`reminder_count` di-reset.

- [ ] **Step 1: Rewrite `applyPaymentSuccess` + docstring**

Update docstring atas file (bagian `Credit model:`):

```ts
 * Credit model: monthly subscription. A purchase SETS the plan's credit
 * allocation and (re)writes the billing period via computePurchaseGrant
 * (lib/billing.ts). Rows whose current_period_end stays NULL are legacy
 * one-time purchases honored until their credits run out.
```

Tambahkan import di bagian atas (setelah import `prdFyPlans`):

```ts
import { computePurchaseGrant } from "@/lib/billing";
```

Hapus `const PLAN_RANK ...` beserta komentarnya (tidak dipakai lagi).

Ganti badan transaksi mulai dari `const plan = planFromAmount(...)` sampai sebelum blok "Mark success LAST":

```ts
		const plan = planFromAmount(payment.amount ?? 0);
		const now = new Date();

		// Re-read the CURRENT period end so an early renewal extends from the
		// still-active period instead of overlapping it (spec §6.1).
		const [existingSub] = await tx
			.select({
				id: subscriptions.id,
				currentPeriodEnd: subscriptions.currentPeriodEnd,
			})
			.from(subscriptions)
			.where(eq(subscriptions.userId, payment.userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1);

		const grant = computePurchaseGrant({
			plan,
			now,
			activePeriodEnd: existingSub?.currentPeriodEnd ?? null,
		});

		if (existingSub) {
			await tx
				.update(subscriptions)
				.set({
					plan,
					status: "active",
					midtransOrderId: orderId,
					credits: grant.credits,
					creditsUsed: 0,
					currentPeriodStart: grant.periodStart,
					currentPeriodEnd: grant.periodEnd,
					cancelledAt: null,
					reminderCount: 0,
					updatedAt: now,
				})
				.where(eq(subscriptions.id, existingSub.id));
		} else {
			await tx.insert(subscriptions).values({
				id: crypto.randomUUID(),
				userId: payment.userId,
				plan,
				status: "active",
				midtransOrderId: orderId,
				credits: grant.credits,
				creditsUsed: 0,
				currentPeriodStart: grant.periodStart,
				currentPeriodEnd: grant.periodEnd,
				reminderCount: 0,
			});
		}
```

(Blok "Mark success LAST" + `return { plan }` tidak berubah.)

- [ ] **Step 2: Tambahkan regression test di `src/lib/services/payment-service.test.ts`**

Append describe baru (import `computePurchaseGrant` tidak perlu — sudah dites di billing.test.ts; test ini menjaga mapping harga → plan tetap benar setelah rewrite):

```ts
describe("monthly model price mapping (regression)", () => {
	it("still maps sandbox amounts to plans after the monthly rewrite", () => {
		expect(planFromAmount(49000)).toBe("pro");
		expect(planFromAmount(149000)).toBe("hengker");
		expect(creditsForPlan("pro")).toBe(30);
		expect(creditsForPlan("hengker")).toBe(105);
		expect(creditsForPlan("free")).toBe(2);
	});
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run src/lib/services/payment-service.test.ts src/lib/billing.test.ts`
Expected: PASS semua.

- [ ] **Step 4: Verify types + lint**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: tsc bersih; biome tidak menemukan error baru.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/payment-service.ts src/lib/services/payment-service.test.ts
git commit -m "feat(payments): monthly SET-grant semantics with additive period renewal"
```

---

### Task 5: Gating paused di API routes (chat / AC / task)

**Files:**
- Modify: `src/routes/api/chat.ts:88-104`
- Modify: `src/routes/api/ac/generate.ts:37-75`
- Modify: `src/routes/api/task/generate.ts` (struktur identik ac/generate.ts — verifikasi dulu blok yang sama di baris ~35-75)

**Interfaces:**
- Consumes: `checkCredits` baru dengan field `subscriptionState` (Task 3); `resolveSubscriptionState` + `EffectiveSubscription` dari `@/lib/billing`.
- Produces: respons error baru `code: "SUBSCRIPTION_PAUSED"` (HTTP 403, pesan Bahasa Indonesia) — dipakai klien untuk membedakan dari `NO_CREDITS`.

- [ ] **Step 1: chat.ts — pesan spesifik saat paused**

Ganti blok `if (!creditCheck.allowed) {...}` (baris 92-103) menjadi:

```ts
					if (!creditCheck.allowed) {
						const paused = creditCheck.subscriptionState === "paused";
						return Response.json(
							{
								error: paused
									? "Masa aktif langgananmu sudah habis. Perpanjang di halaman Pricing untuk membuat proyek baru."
									: "Kredit kamu sudah habis. Beli kredit untuk membuat proyek baru.",
								code: paused ? "SUBSCRIPTION_PAUSED" : "NO_CREDITS",
								plan: creditCheck.plan,
								remaining: creditCheck.remaining,
							},
							{ status: 403 },
						);
					}
```

- [ ] **Step 2: ac/generate.ts — resolve state efektif, bukan plan mentah**

Ganti blok dari `const [sub] = await db` (baris 37) sampai `await recordRequest(user.id, "api_call");` (baris 75) menjadi:

```ts
				const { resolveSubscriptionState } = await import("@/lib/billing");
				const [sub] = await db
					.select({
						plan: subscriptions.plan,
						status: subscriptions.status,
						currentPeriodEnd: subscriptions.currentPeriodEnd,
						cancelledAt: subscriptions.cancelledAt,
					})
					.from(subscriptions)
					.where(eq(subscriptions.userId, user.id))
					.orderBy(desc(subscriptions.createdAt))
					.limit(1);
				const eff = resolveSubscriptionState(sub, new Date());

				if (eff.state === "paused") {
					return Response.json(
						{
							error:
								"Masa aktif langgananmu sudah habis. Perpanjang di halaman Pricing untuk generate AC.",
							code: "SUBSCRIPTION_PAUSED",
						},
						{ status: 403 },
					);
				}

				if (!hasFullWorkflow(eff.effectivePlan)) {
					return Response.json(
						{
							error: "Generate AC hanya tersedia di paket Pro dan Hengker.",
							code: "UPGRADE_REQUIRED",
							plan: eff.effectivePlan,
						},
						{ status: 403 },
					);
				}

				const creditCheck = await checkCredits(user.id);
				if (!creditCheck.allowed) {
					return Response.json(
						{
							error: "Kredit kamu sudah habis. Beli kredit untuk generate AC.",
							code: "NO_CREDITS",
							plan: creditCheck.plan,
							remaining: creditCheck.remaining,
						},
						{ status: 403 },
					);
				}

				const rateCheck = await checkRateLimit(
					user.id,
					eff.effectivePlan,
					"api_call",
				);
				if (!rateCheck.allowed)
					return Response.json(
						{ error: "Too many requests", retryAfter: 60 },
						{ status: 429 },
					);
				await recordRequest(user.id, "api_call");
```

Jika ada variabel `plan` lama yang masih direferensikan setelah blok ini di file tersebut, ganti referensinya menjadi `eff.effectivePlan`.

- [ ] **Step 3: task/generate.ts — mirror perubahan Step 2**

Baca file, temukan blok yang sama (select `subscriptions.plan` → `hasFullWorkflow` → `checkCredits` → `checkRateLimit` → `recordRequest`). Terapkan transformasi identik dengan Step 2, dengan dua teks berbeda:

- Pesan paused: `"Masa aktif langgananmu sudah habis. Perpanjang di halaman Pricing untuk generate Task."`
- Pesan upgrade: `"Generate Task hanya tersedia di paket Pro dan Hengker."`

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }; if ($?) { pnpm vitest run }`
Expected: semua bersih/pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/chat.ts src/routes/api/ac/generate.ts src/routes/api/task/generate.ts
git commit -m "feat(api): SUBSCRIPTION_PAUSED gate and effective-plan resolution on generators"
```

---

### Task 6: Server fn `cancelSubscription`

**Files:**
- Modify: `src/app/actions/payment.ts`

**Interfaces:**
- Produces: `cancelSubscription(): Promise<{ success: boolean; message: string }>` — dipakai Task 8 (halaman billing).
- Aturan (spec §6.2): mutasi row TERAKHIR milik user → `plan='free'`, `status='active'`, `cancelled_at=now`, periode free segar (`computeFreeRolloverPeriod`), `credits=PLAN_CREDITS.free`, `creditsUsed=0`.

- [ ] **Step 1: Tambahkan server fn di akhir `src/app/actions/payment.ts`**

(`eq`, `desc`, `requireUser`, `createServerFn`, `getRequestHeaders` sudah di-import top-level oleh file ini.)

```ts
/**
 * Cancel flow (spec §6.2): downgrades the latest subscription row to a normal
 * Free account with a fresh monthly period. Payment history stays intact in
 * the payments table. Idempotent: cancelling a free account is a no-op reset.
 */
export const cancelSubscription = createServerFn({ method: "POST" }).handler(
	async () => {
		const user = await requireUser(getRequestHeaders());
		const { db } = await import("@/db");
		const { subscriptions } = await import("@/db/schema");
		const { computeFreeRolloverPeriod } = await import("@/lib/billing");
		const { PLAN_CREDITS } = await import("@/types/database");

		const now = new Date();
		const period = computeFreeRolloverPeriod(now);

		const [row] = await db
			.select({ id: subscriptions.id })
			.from(subscriptions)
			.where(eq(subscriptions.userId, user.id))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1);
		if (!row)
			return { success: false, message: "Langganan tidak ditemukan." };

		await db
			.update(subscriptions)
			.set({
				plan: "free",
				status: "active",
				cancelledAt: now,
				currentPeriodStart: period.start,
				currentPeriodEnd: period.end,
				credits: PLAN_CREDITS.free,
				creditsUsed: 0,
				updatedAt: now,
			})
			.where(eq(subscriptions.id, row.id));

		return {
			success: true,
			message: "Langganan dibatalkan. Akunmu kembali ke paket Free.",
		};
	},
);
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/payment.ts
git commit -m "feat(payments): cancelSubscription server fn downgrading to fresh free tier"
```

---

### Task 7: `/api/user/plan` + hook `useUserPlan` expose state langganan

**Files:**
- Modify: `src/routes/api/user/plan.ts`
- Modify: `src/hooks/use-user-plan.ts`

**Interfaces:**
- Consumes: `CreditBalance` baru (Task 3).
- Produces: JSON `/api/user/plan` kini menyertakan `subscriptionState` dan `currentPeriodEnd` (ISO string via Response.json otomatis); `UserPlan` interface bertambah `subscriptionState?` dan `currentPeriodEnd?: string | null` — dipakai Task 8 & 10.

- [ ] **Step 1: Perluas respons unauthenticated di `src/routes/api/user/plan.ts`**

Ganti objek pada kasus belum login agar bentuknya konsisten:

```ts
				if (!session?.user)
					return Response.json({
						authenticated: false,
						plan: "free",
						credits: 0,
						creditsUsed: 0,
						remaining: 0,
						subscriptionState: "free_active",
						currentPeriodEnd: null,
					});
```

(Cabang authenticated tidak perlu diubah — `...balance` otomatis membawa field baru.)

- [ ] **Step 2: Perluas `UserPlan` di `src/hooks/use-user-plan.ts`**

```ts
export type SubscriptionUiState =
	| "free_active"
	| "legacy_grandfathered"
	| "active_paid"
	| "paused";

export interface UserPlan {
	authenticated: boolean;
	plan: Plan;
	credits: number;
	creditsUsed: number;
	remaining: number | "unlimited";
	/** Present from the authenticated branch of /api/user/plan. */
	subscriptionState?: SubscriptionUiState;
	/** ISO string of the current billing period end, if any. */
	currentPeriodEnd?: string | null;
}
```

Dan fallback di `queryFn` saat `!res.ok` tambahkan `subscriptionState: "free_active"` agar konsumen tidak perlu narrow:

```ts
				return {
					authenticated: false,
					plan: "free" as Plan,
					credits: 0,
					creditsUsed: 0,
					remaining: 0,
					subscriptionState: "free_active" as const,
				};
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: bersih (konsumen existing modal/navbar/history memakai field lama — tetap kompilasi).

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/user/plan.ts src/hooks/use-user-plan.ts
git commit -m "feat(plan-api): expose subscriptionState and period end to clients"
```

---

### Task 8: Halaman `/settings/billing` — status langganan, Cancel, Renew

**Files:**
- Modify: `src/routes/settings/billing.tsx`

**Interfaces:**
- Consumes: `cancelSubscription` (Task 6); loader data diperluas dengan tanggal serial.
- Produces: UI lengkap alur paused → renew (link `/pricing`) atau cancel (dialog konfirmasi).

- [ ] **Step 1: Serialisasi tanggal baru di `loadBilling`**

Ganti mapper `subscription` (baris ~34-40):

```ts
	const subscription = subRows[0]
		? {
				...subRows[0],
				createdAt: subRows[0].createdAt?.toISOString() ?? null,
				updatedAt: subRows[0].updatedAt?.toISOString() ?? null,
				currentPeriodEnd: subRows[0].currentPeriodEnd?.toISOString() ?? null,
				cancelledAt: subRows[0].cancelledAt?.toISOString() ?? null,
			}
		: undefined;
```

- [ ] **Step 2: Import server fn + ikon**

Tambahkan di import blok atas file:

```ts
import { AlertTriangle, CalendarClock } from "lucide-react";
import { cancelSubscription } from "@/app/actions/payment";
```

(`Trash2`, `useState`, `Link`, `useUIStore`, `formatDate` sudah ada.)

- [ ] **Step 3: State + handler cancel di `BillingPage`**

Di dalam komponen `BillingPage` (setelah `const [deleteId, setDeleteId] = useState<string | null>(null);`):

```ts
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	const handleCancel = async () => {
		setCancelling(true);
		try {
			const res = await cancelSubscription();
			showToast(res.message, res.success ? "success" : "error");
			if (res.success) window.location.reload();
		} catch {
			showToast("Gagal membatalkan langganan. Coba lagi.", "error");
		} finally {
			setCancelling(false);
			setCancelOpen(false);
		}
	};

	// Derived subscription display state (server truth via loader dates).
	const planLabel = (subscription?.plan as string) || "free";
	const isPaidPlan = planLabel === "pro" || planLabel === "hengker";
	const periodEndDate = subscription?.currentPeriodEnd
		? new Date(subscription.currentPeriodEnd)
		: null;
	const isPaused =
		isPaidPlan && periodEndDate !== null && periodEndDate.getTime() < Date.now();
	const statusText = isPaidPlan
		? isPaused
			? "Pause — masa aktif habis"
			: periodEndDate
				? `Aktif s.d. ${formatDate(periodEndDate.toISOString())}`
				: "Aktif (paket lama, tanpa masa aktif)"
		: "Gratis";
```

- [ ] **Step 4: Ganti kartu status (baris 103-118)**

Ganti `<div className="flex items-center justify-between">...</div>` pertama dalam kartu "Billing & Kredit" menjadi:

```tsx
					<div className="flex items-center justify-between">
						<div>
							<span className="text-3xl font-bold capitalize">
								{planLabel}
								{isPaidPlan && !periodEndDate ? (
									<span className="ml-2 align-middle rounded-full bg-(--bg-surface) px-2 py-0.5 text-xs font-medium text-(--text-secondary)">
										legacy
									</span>
								) : null}
							</span>
							<p
								className={`mt-1 flex items-center gap-1.5 text-sm ${
									isPaused ? "text-amber-600 dark:text-amber-400" : "text-(--text-secondary)"
								}`}
							>
								{isPaused ? <AlertTriangle size={14} /> : <CalendarClock size={14} />}
								{statusText}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{isPaidPlan && !isPaused && (
								<button
									type="button"
									onClick={() => setCancelOpen(true)}
									className="rounded-lg border border-(--border-subtle) px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
								>
									Cancel Langganan
								</button>
							)}
							<Link
								to="/pricing"
								className="rounded-lg border border-(--border-subtle) px-4 py-2 text-sm font-medium hover:bg-(--bg-surface)"
							>
								{isPaused ? "Perpanjang" : "Beli Paket"}
							</Link>
						</div>
					</div>
```

- [ ] **Step 5: Perbaiki copy hangus (baris ~135-139)**

Ganti teks footer progress bar:

```tsx
						<p className="mt-2 text-xs text-(--text-secondary)">
							{isPaused
								? "Masa aktif habis — sisa kredit periode lama hangus. Perpanjang untuk dapat kredit segar."
								: remaining > 0
									? `Sisa ${remaining} kredit periode ini. Kredit reset setiap 30 hari.`
									: "Kredit periode ini habis. Perpanjang atau tunggu reset berikutnya."}
						</p>
```

- [ ] **Step 6: Dialog konfirmasi cancel (sejajar dialog delete)**

Tambahkan tepat sebelum dialog delete (`{/* Delete confirmation dialog */}`):

```tsx
			{/* Cancel subscription confirmation */}
			{cancelOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full mx-4 max-w-sm rounded-xl border border-(--border-subtle) bg-(--bg-card) p-6">
						<h3 className="mb-2 font-inter font-[510] text-lg">
							Batalkan Langganan?
						</h3>
						<p className="mb-6 text-sm text-(--text-secondary)">
							Akunmu akan kembali ke paket Free (2 kredit PRD per bulan) dan
							sisa kredit {planLabel} kamu hangus. Riwayat pembayaran tetap
							tersimpan. Tindakan ini langsung berlaku.
						</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setCancelOpen(false)}
								className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-(--bg-surface)"
							>
								Kembali
							</button>
							<button
								type="button"
								disabled={cancelling}
								onClick={handleCancel}
								className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
							>
								{cancelling ? "Memproses..." : "Ya, Batalkan"}
							</button>
						</div>
					</div>
				</div>
			)}
```

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: bersih.

- [ ] **Step 8: Manual smoke (dev)**

Run: `pnpm dev` → login → buka `/settings/billing`.
Expected: kartu status tampil; akun free tidak melihat tombol Cancel; tidak ada console error.

- [ ] **Step 9: Commit**

```bash
git add src/routes/settings/billing.tsx
git commit -m "feat(billing-ui): subscription status, pause notice, cancel flow and renew CTA"
```

---

### Task 9: Copy pricing per-bulan

**Files:**
- Modify: `src/lib/pricing-data.ts`
- Modify: `src/types/database.ts:73-85` (komentar saja)
- Modify: `src/routes/api/payments/create.ts:86` (nama item Midtrans)

**Interfaces:**
- Produces: `FEATURE_ROWS` punya row baru `key: "monthly-reset"`; deskripsi & label tombol baru. Tidak ada perubahan bentuk data (konsumen `prdFyPlans` aman).

- [ ] **Step 1: `pricing-data.ts` — feature rows, deskripsi, tombol**

Ubah `FEATURE_ROWS` (tambah satu entry di awal):

```ts
const FEATURE_ROWS = [
	{ key: "monthly-reset", name: "Kredit reset tiap bulan" },
	{ key: "prd", name: "Generate PRD" },
	{ key: "revisi", name: "Revisi tanpa batas" },
	{ key: "export-md", name: "Export ke Markdown" },
	{ key: "workflow", name: "Full workflow (AC + Task + Kanban)" },
	{ key: "share", name: "Bagikan PRD (Share Link)" },
	{ key: "version-30", name: "Riwayat 30 versi" },
	{ key: "version-unlimited", name: "Riwayat versi tak terbatas" },
	{ key: "priority", name: "Antrean prioritas" },
] as const;
```

Perbarui ketiga tier di `prdFyPlans`:

- free: `description: "2 kredit PRD per bulan. Gratis selamanya."`, features: `buildFeatures(["monthly-reset", "prd", "revisi", "export-md"])`
- pro: `description: "30 kredit/bulan, full workflow dari PRD sampai Kanban."`, `buttonLabel: "Berlangganan Pro"`, features: `buildFeatures(["monthly-reset", "prd", "revisi", "export-md", "workflow", "share", "version-30"])`
- hengker: `description: "105 kredit/bulan, model premium, dan antrean prioritas."`, `buttonLabel: "Berlangganan Hengker"`, features: `buildFeatures(FEATURE_ROWS.map((row) => row.key))`

Update komentar interface `PriceTier.price`:

```ts
	/** Monthly price in IDR. Credits reset every BILLING_PERIOD_DAYS. */
	price: number;
```

- [ ] **Step 2: Komentar `types/database.ts`**

```ts
/** Credits granted per billing period. 1 credit = 1 stage (PRD, AC, or Task). Leftovers expire at period end. */
export const PLAN_CREDITS: Record<Plan, number> = {
```

```ts
/** Monthly subscription price in IDR. */
export const PLAN_PRICES: Record<Plan, number> = {
```

- [ ] **Step 3: Label item Midtrans di `create.ts:86`**

```ts
							name: `Paket ${plan.name} - ${plan.credits} kredit/bulan`,
```

- [ ] **Step 4: Test + verify**

Tambahkan assertion copy di `src/lib/billing.test.ts`? Tidak — buat cepat di test existing types: buka `src/types/database.test.ts` dan PERTAHANKAN semua assertion existing (angka 2/30/105 tidak berubah). Lalu:

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm vitest run }; if ($?) { pnpm check }`
Expected: pass semua (test types masih hijau karena angka tak berubah).

- [ ] **Step 5: Manual smoke**

Run: `pnpm dev` → buka `/pricing`.
Expected: deskripsi "/bulan" tampil, badge/kolom "Kredit reset tiap bulan" hadir di ketiga tier, tombol "Berlangganan Pro/Hengker".

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing-data.ts src/types/database.ts src/routes/api/payments/create.ts
git commit -m "feat(pricing): monthly billing copy across tiers and Midtrans item label"
```

---

### Task 10: Banner global saat paused

**Files:**
- Create: `src/components/layout/subscription-banner.tsx`
- Modify: `src/components/layout/app-layout.tsx:47`

**Interfaces:**
- Consumes: `useUserPlan()` dengan `subscriptionState` (Task 7).
- Produces: komponen `SubscriptionBanner` — self-contained, render null kecuali paused.

- [ ] **Step 1: Buat komponen**

```tsx
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useUserPlan } from "@/hooks/use-user-plan";

/**
 * Global pause notice (spec §8). Rendered inside AppLayout next to the
 * Navbar; driven entirely by server truth (/api/user/plan) — no client-side
 * guessing from credit counts.
 */
export function SubscriptionBanner() {
	const { data } = useUserPlan();
	if (!data?.authenticated || data.subscriptionState !== "paused") return null;

	return (
		<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
			<AlertTriangle size={16} className="shrink-0" aria-hidden />
			<span>
				Masa aktif langganan <b className="capitalize">{data.plan}</b>{" "}
				sudah habis — sisa kredit hangus dan generate terkunci.
			</span>
			<Link
				to="/settings/billing"
				className="font-semibold underline underline-offset-2 hover:opacity-80"
			>
				Perpanjang atau batalkan
			</Link>
		</div>
	);
}
```

- [ ] **Step 2: Mount di AppLayout**

Di `src/components/layout/app-layout.tsx`, tambah import:

```tsx
import { SubscriptionBanner } from "./subscription-banner";
```

Ganti baris 47:

```tsx
			{!hideNavbar && <Navbar />}
```

menjadi:

```tsx
			{!hideNavbar && (
				<>
					<Navbar />
					<SubscriptionBanner />
				</>
			)}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: bersih.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/subscription-banner.tsx src/components/layout/app-layout.tsx
git commit -m "feat(layout): global paused-subscription banner driven by server state"
```

---

### Task 11: Wrapper email Resend

**Files:**
- Create: `src/lib/email.ts`
- Modify: `.env.example`
- Install: package `resend`

**Interfaces:**
- Produces:
  - `sendEmail(args: { to: string; subject: string; html: string }): Promise<boolean>` — selalu resolve, tidak pernah throw; `false` = gagal/skip (best-effort, spec §7.1).
  - `preExpiryNoticeEmail(planName: string, endDate: Date): { subject: string; html: string }`
  - `pausedReminderEmail(planName: string, daysLate: number): { subject: string; html: string }`
- Env: `RESEND_API_KEY` (sudah ada di .env.example), `EMAIL_FROM` (baru), fallback `PrdFy <onboarding@resend.dev>`.

- [ ] **Step 1: Install dependency**

Run: `pnpm add resend`
Expected: tercatat di `dependencies` package.json.

- [ ] **Step 2: Buat `src/lib/email.ts`**

```ts
/**
 * Resend email wrapper — best-effort delivery (spec §7.1).
 *
 * ponytail: dynamic import keeps the SDK out of any bundle that merely type-
 * references this module, consistent with db/pg handling. Callers must treat
 * `false` as "not sent, continue anyway" — email NEVER breaks a request path.
 */

export interface SendEmailArgs {
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<boolean> {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		console.warn("[email] RESEND_API_KEY missing — skipping send");
		return false;
	}
	try {
		const { Resend } = await import("resend");
		const client = new Resend(apiKey);
		const from = process.env.EMAIL_FROM || "PrdFy <onboarding@resend.dev>";
		const { error } = await client.emails.send({
			from,
			to: args.to,
			subject: args.subject,
			html: args.html,
		});
		if (error) {
			console.error("[email] resend rejected:", error);
			return false;
		}
		return true;
	} catch (err) {
		console.error("[email] send failed:", err);
		return false;
	}
}

function shell(title: string, bodyHtml: string): string {
	return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937">
<h2 style="margin:0 0 12px">${title}</h2>
${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#6b7280">Email otomatis dari PrdFy.</p>
</div>`;
}

export function preExpiryNoticeEmail(
	planName: string,
	endDate: Date,
): { subject: string; html: string } {
	const dateLabel = endDate.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	return {
		subject: `Masa aktif ${planName} kamu berakhir ${dateLabel}`,
		html: shell(
			`Masa aktif ${planName} segera berakhir`,
			`<p>Halo!</p><p>Paket <b>${planName}</b> kamu akan berakhir pada <b>${dateLabel}</b>. Sisa kredit bulan ini hangus setelah periode berakhir.</p>
<p><a href="${process.env.APP_URL || ""}/pricing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Perpanjang sekarang</a></p>`,
		),
	};
}

export function pausedReminderEmail(
	planName: string,
	daysLate: number,
): { subject: string; html: string } {
	return {
		subject: `Akun ${planName} kamu sedang pause ${daysLate} hari`,
		html: shell(
			`Langganan ${planName} sedang pause`,
			`<p>Sudah <b>${daysLate} hari</b> sejak masa aktif ${planName} berakhir. Selama pause kamu masih bisa melihat semua proyek, tapi generate terkunci.</p>
<p>Pilih salah satu: <b>perpanjang</b> untuk lanjut full workflow, atau <b>batalkan</b> untuk kembali ke paket Free.</p>
<p><a href="${process.env.APP_URL || ""}/settings/billing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;text-decoration:none">Kelola langganan</a></p>`,
		),
	};
}
```

- [ ] **Step 3: Update `.env.example`**

Di bawah blok `# === Email (Resend) ===` ubah menjadi:

```
# === Email (Resend) ===
RESEND_API_KEY=""
FEEDBACK_EMAIL=""
# Sender identity for billing emails, e.g. "PrdFy <billing@yourdomain.com>"
EMAIL_FROM=""
# Shared secret for GET /api/cron/billing (Vercel Cron sends "Authorization: Bearer $CRON_SECRET"
# automatically when this env name exists on the project; either name works).
CRON_BILLING_SECRET=""
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit; if ($?) { pnpm check }`
Expected: bersih.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts .env.example package.json pnpm-lock.yaml
git commit -m "feat(email): best-effort Resend wrapper with Indonesian billing templates"
```

---

### Task 12: Seleksi target email — pure `selectBillingEmailTargets`

**Files:**
- Create: `src/lib/services/billing-emails.ts`
- Test: `src/lib/services/billing-emails.test.ts`

**Interfaces:**
- Consumes: `PRE_EXPIRY_NOTICE_DAYS`, `REMINDER_SCHEDULE_DAYS` (Task 1).
- Produces:
  - `interface BillingCandidateRow { userId: string; email: string; plan: string; currentPeriodEnd: Date; reminderCount: number }`
  - `type BillingEmailTarget = { userId: string; email: string; plan: "pro" | "hengker"; kind: "pre_expiry" } | { userId: string; email: string; plan: "pro" | "hengker"; kind: "paused_reminder"; daysLate: number }`
  - `selectBillingEmailTargets(rows: BillingCandidateRow[], now: Date): BillingEmailTarget[]`
- Kontrak counter (spec §7.2): `reminderCount=0` → cuma kandidat pre-expiry H-3. Setelah expire, jumlah reminder terkirim = `clamp(count-1, 0, 3)`; reminder ke-N dikirim saat `daysLate >= REMINDER_SCHEDULE_DAYS[N]`. Pengirim (Task 13) increment `reminder_count` +1 per email sukses — total maksimum 4 email per siklus.

- [ ] **Step 1: Tulis test gagal**

```ts
import { describe, expect, it } from "vitest";
import {
	selectBillingEmailTargets,
	type BillingCandidateRow,
} from "./billing-emails";

const NOW = new Date("2026-08-25T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function prow(overrides: Partial<BillingCandidateRow> = {}): BillingCandidateRow {
	return {
		userId: "u1",
		email: "u1@example.com",
		plan: "pro",
		currentPeriodEnd: new Date(NOW.getTime() - 2 * DAY),
		reminderCount: 1,
		...overrides,
	};
}

describe("selectBillingEmailTargets", () => {
	it("skips free/hengker-less junk plans and NULL periods", () => {
		const targets = selectBillingEmailTargets(
			[
				prow({ userId: "free-guy", plan: "free" }),
				prow({
					userId: "legacy",
					currentPeriodEnd: null as unknown as Date,
				}),
			],
			NOW,
		);
		expect(targets).toHaveLength(0);
	});

	it("pre_expiry when within 3 days before end and nothing sent yet", () => {
		const targets = selectBillingEmailTargets(
			[prow({ currentPeriodEnd: new Date(NOW.getTime() + 2 * DAY), reminderCount: 0 })],
			NOW,
		);
		expect(targets).toEqual([
			{ userId: "u1", email: "u1@example.com", plan: "pro", kind: "pre_expiry" },
		]);
	});

	it("no pre_expiry outside the window or when notice already sent", () => {
		expect(
			selectBillingEmailTargets(
				[prow({ currentPeriodEnd: new Date(NOW.getTime() + 5 * DAY), reminderCount: 0 })],
				NOW,
			),
		).toHaveLength(0);
		expect(
			selectBillingEmailTargets(
				[prow({ currentPeriodEnd: new Date(NOW.getTime() + 2 * DAY), reminderCount: 1 })],
				NOW,
			),
		).toHaveLength(0);
	});

	it("first paused reminder fires at D+1 (even if H-3 notice was missed)", () => {
		const targets = selectBillingEmailTargets(
			[prow({ currentPeriodEnd: new Date(NOW.getTime() - 1 * DAY), reminderCount: 0 })],
			NOW,
		);
		expect(targets[0]).toMatchObject({ kind: "paused_reminder", daysLate: 1 });
	});

	it("schedule D+1/D+7/D+14 advances with reminderCount then stops", () => {
		const mk = (count: number, days: number) =>
			prow({ reminderCount: count, currentPeriodEnd: new Date(NOW.getTime() - days * DAY) });

		expect(selectBillingEmailTargets([mk(1, 0)], NOW)).toHaveLength(0); // belum genap 1 hari
		expect(selectBillingEmailTargets([mk(1, 1)], NOW)).toHaveLength(1);
		expect(selectBillingEmailTargets([mk(2, 6)], NOW)).toHaveLength(0);
		expect(selectBillingEmailTargets([mk(2, 7)], NOW)).toHaveLength(1);
		expect(selectBillingEmailTargets([mk(3, 13)], NOW)).toHaveLength(0);
		expect(selectBillingEmailTargets([mk(3, 14)], NOW)).toHaveLength(1);
		expect(selectBillingEmailTargets([mk(4, 40)], NOW)).toHaveLength(0); // cap
	});
});
```

- [ ] **Step 2: Run — pastikan FAIL**

Run: `pnpm vitest run src/lib/services/billing-emails.test.ts`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implement `src/lib/services/billing-emails.ts`**

```ts
/**
 * Pure selection of who should receive a billing email right now (spec §7.2).
 * ponytail: no db imports — the cron endpoint (Task 13) fetches candidates and
 * delegates ALL timing decisions here so the schedule is unit-testable.
 */
import { PRE_EXPIRY_NOTICE_DAYS, REMINDER_SCHEDULE_DAYS } from "@/lib/constants";

export interface BillingCandidateRow {
	userId: string;
	email: string;
	plan: string;
	currentPeriodEnd: Date;
	reminderCount: number;
}

export type PaidPlan = "pro" | "hengker";

export type BillingEmailTarget =
	| { userId: string; email: string; plan: PaidPlan; kind: "pre_expiry" }
	| {
			userId: string;
			email: string;
			plan: PaidPlan;
			kind: "paused_reminder";
			daysLate: number;
	  };

const DAY_MS = 24 * 60 * 60 * 1000;

function asPaidPlan(plan: string): PaidPlan | null {
	return plan === "pro" || plan === "hengker" ? plan : null;
}

export function selectBillingEmailTargets(
	rows: BillingCandidateRow[],
	now: Date,
): BillingEmailTarget[] {
	const targets: BillingEmailTarget[] = [];

	for (const row of rows) {
		const plan = asPaidPlan(row.plan);
		const end = row.currentPeriodEnd;
		if (!plan || end == null) continue; // free rows & legacy grandfathered never email

		if (now.getTime() <= end.getTime()) {
			const msLeft = end.getTime() - now.getTime();
			if (row.reminderCount === 0 && msLeft <= PRE_EXPIRY_NOTICE_DAYS * DAY_MS) {
				targets.push({ userId: row.userId, email: row.email, plan, kind: "pre_expiry" });
			}
			continue;
		}

		const daysLate = Math.floor((now.getTime() - end.getTime()) / DAY_MS);
		const sentPostExpiry = Math.max(
			0,
			Math.min(row.reminderCount - 1, REMINDER_SCHEDULE_DAYS.length),
		);
		if (
			sentPostExpiry < REMINDER_SCHEDULE_DAYS.length &&
			daysLate >= REMINDER_SCHEDULE_DAYS[sentPostExpiry]
		) {
			targets.push({
				userId: row.userId,
				email: row.email,
				plan,
				kind: "paused_reminder",
				daysLate,
			});
		}
	}

	return targets;
}
```

- [ ] **Step 4: Run — pastikan PASS**

Run: `pnpm vitest run src/lib/services/billing-emails.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/billing-emails.ts src/lib/services/billing-emails.test.ts
git commit -m "feat(billing): pure reminder-target selection with anti-spam counter contract"
```

---

### Task 13: Endpoint cron `/api/cron/billing` + konfigurasi Vercel

**Files:**
- Create: `src/routes/api/cron/billing.ts`
- Create: `vercel.json`

**Interfaces:**
- Consumes: `selectBillingEmailTargets` (Task 12), `sendEmail` + template builders (Task 11).
- Produces: `GET /api/cron/billing` → `{ ok: true, sent: n }`; 401 kalau secret salah/absen. Auth menerima `CRON_BILLING_SECRET` ATAU `CRON_SECRET` (Vercel Cron auto-inject header `Authorization: Bearer $CRON_SECRET` bila env bernama itu ada — dukung keduanya).

- [ ] **Step 1: Buat route**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import {
	preExpiryNoticeEmail,
	pausedReminderEmail,
	sendEmail,
} from "@/lib/email";
import {
	selectBillingEmailTargets,
	type BillingCandidateRow,
} from "@/lib/services/billing-emails";

/** Constant-time string compare via SHA-256 digests (length-safe). */
function secretsMatch(provided: string, secret: string): boolean {
	const a = createHash("sha256").update(provided).digest();
	const b = createHash("sha256").update(secret).digest();
	return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/cron/billing")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const secret =
					process.env.CRON_BILLING_SECRET ?? process.env.CRON_SECRET;
				const header = request.headers.get("authorization") ?? "";
				const provided = header.startsWith("Bearer ")
					? header.slice("Bearer ".length)
					: "";
				if (!secret || !provided || !secretsMatch(provided, secret)) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				// Loose candidate filter; exact scheduling happens in the pure
				// selector. One row per user is the current invariant (single
				// subscriptions row mutated in place since signup).
				const rows: BillingCandidateRow[] = await db
					.select({
						userId: subscriptions.userId,
						email: users.email,
						plan: subscriptions.plan,
						currentPeriodEnd: subscriptions.currentPeriodEnd,
						reminderCount: subscriptions.reminderCount,
					})
					.from(subscriptions)
					.innerJoin(users, eq(users.id, subscriptions.userId))
					.where(
						and(
							inArray(subscriptions.plan, ["pro", "hengker"]),
							eq(subscriptions.status, "active"),
							isNotNull(subscriptions.currentPeriodEnd),
							lte(
								subscriptions.currentPeriodEnd,
								sql`now() + interval '3 days'`,
							),
						),
					);

				const targets = selectBillingEmailTargets(rows, new Date());
				let sent = 0;

				for (const t of targets) {
					const mail =
						t.kind === "pre_expiry"
							? preExpiryNoticeEmail(t.plan, new Date())
							: pausedReminderEmail(t.plan, t.daysLate);
					// ponytail: pre-expiry lacks a precise end date in the target —
					// refetch-free approximation is unacceptable, so look it up.
					let endDate: Date | null = null;
					for (const r of rows) {
						if (r.userId === t.userId) {
							endDate = r.currentPeriodEnd;
							break;
						}
					}
					const finalMail =
						t.kind === "pre_expiry" && endDate
							? preExpiryNoticeEmail(t.plan, endDate)
							: mail;

					const ok = await sendEmail({
						to: t.email,
						subject: finalMail.subject,
						html: finalMail.html,
					});
					if (!ok) continue; // best-effort: skip, never abort the batch

					sent += 1;
					await db
						.update(subscriptions)
						.set({
							reminderCount: sql`${subscriptions.reminderCount} + 1`,
							updatedAt: new Date(),
						})
						.where(eq(subscriptions.userId, t.userId));
				}

				return Response.json({ ok: true, sent });
			},
		},
	},
});
```

Catatan desain: increment dilakukan **per user** setelah sukses; retry cron berikutnya tidak mendobel karena seleksi pure membaca `reminderCount` terbaru.

- [ ] **Step 2: Buat `vercel.json`**

```json
{
	"crons": [{ "path": "/api/cron/billing", "schedule": "0 3 * * *" }]
}
```

(Jika `vercel.json` sudah ada di masa depan, merge key `crons` — jangan menimpa properti lain.)

- [ ] **Step 3: Generate route tree + verify**

Run: `pnpm generate-routes; if ($?) { pnpm exec tsc --noEmit }; if ($?) { pnpm check }`
Expected: route terdaftar di routeTree.gen.ts; tsc + biome bersih.

- [ ] **Step 4: Smoke test endpoint lokal (tanpa secret → 401; dengan secret → 200)**

Terminal 1: `pnpm dev`
Terminal 2:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/cron/billing
curl.exe -s -H "Authorization: Bearer salah" http://localhost:3000/api/cron/billing
```

Expected: `401` untuk keduanya. Lalu set `CRON_BILLING_SECRET=test123` di `.env`, restart dev, dan:

```powershell
curl.exe -s -H "Authorization: Bearer test123" http://localhost:3000/api/cron/billing
```

Expected: `{"ok":true,"sent":0}` (belum ada kandidat di DB dev).

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/cron/billing.ts vercel.json
git add "**/routeTree.gen.ts"
git commit -m "feat(cron): daily billing reminder endpoint with bearer secret and Vercel schedule"
```

---

### Task 14: Regresi penuh + checklist QA manual Midtrans sandbox

**Files:**
- Tidak ada file baru — gerbang kualitas sebelum selesai.

- [ ] **Step 1: Suite + types + lint penuh**

Run: `pnpm vitest run; if ($?) { pnpm exec tsc --noEmit }; if ($?) { pnpm check }`
Expected: SEMUA pass, 0 error. Jika merah, perbaiki sebelum lanjut — jangan commit merah.

- [ ] **Step 2: Build produksi**

Run: `pnpm build`
Expected: sukses tanpa error (menangkap import server-only yang bocor ke client).

- [ ] **Step 3: QA manual — Midtrans sandbox (checklist)**

Jalankan `pnpm dev` dengan kredensial sandbox, lalu verifikasi urutan ini:

1. Signup akun baru → row `subscriptions` punya `current_period_start/end` (±30 hari), credits 2.
2. Beli Pro via Snap sandbox → settlement → credits 30, periode +30 hari dari sekarang, `midtrans_order_id` terisi.
3. Webhook replay/duplikat (kirim ulang notifikasi dari dashboard Midtrans) → TIDAK ada perubahan kedua (idempoten).
4. Beli lagi saat masih aktif Pro → periode EXTEND dari `current_period_end` lama, credits kembali 30 (bukan 60).
5. Geser `current_period_end` ke masa lalu lewat SQL (simulasi expired) → `/api/user/plan` balikin `subscriptionState: "paused"`, remaining 0; coba generate PRD → 403 `SUBSCRIPTION_PAUSED`; banner amber tampil; halaman billing tunjuk "Pause" + tombol Perpanjang.
6. Renew dari kondisi paused → aktif lagi, credits 30, periode mulai sekarang, banner hilang.
7. Ulangi simulasi expired lalu klik Cancel Langganan → plan jadi free, credits 2, dialog toast sukses, riwayat pembayaran masih ada.
8. Set `RESEND_API_KEY` sandbox + `EMAIL_FROM`, jalankan curl authorized ke `/api/cron/billing` dengan fixture DB (sub H-3 dan sub paused D+1) → email masuk, `reminder_count` naik, panggil ulang → tidak ada email dobel.
9. User lama (row `current_period_end` NULL, mis. hasil restore data lama) → bisa generate seperti biasa sampai kreditnya habis (grandfathered).

- [ ] **Step 4: Commit akhir (jika ada perbaikan kecil selama QA)**

```bash
git add -A
git commit -m "chore(billing): post-QA fixes from sandbox verification"
git push
```

---

## Catatan Eksekusi

- Urutan task bersifat dependen (1→2→3→4→5; 6–10 bergantung 3; 11→12→13). Jangan tukar urutan.
- Semua commit English conventional (repo style: `feat:`, `fix:`, `docs:`, `chore:`).
- Rollback aman: revert deploy; kolom nullable diabaikan kode lama; tidak ada rollback DB.
- **Setelah semua task selesai — deployment produksi (spec §11):**
  1. Merge → jalankan `pnpm db:migrate` terhadap DB produksi (kolom nullable, non-breaking).
  2. Deploy aplikasi baru.
  3. Set env produksi di Vercel: `RESEND_API_KEY`, `EMAIL_FROM`, dan secret cron (`CRON_BILLING_SECRET` atau `CRON_SECRET` — keduanya diterima endpoint).
  4. Verifikasi `vercel.json` crons aktif (dashboard Vercel → Project → Crons).
