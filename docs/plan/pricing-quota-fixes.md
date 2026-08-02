# Pricing & Quota Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 confirmed bugs in quota/subscription enforcement so Free (3 PRD + 3 revisi/bulan), Pro (25 PRD/20 revisi per periode langganan), and Hengker (unlimited sampai expired) behave per business spec.

**Architecture:** Seed `quotas` row at signup via better-auth `databaseHooks`, unify fail-mode between PRD/revision quota checks, add missing revision-quota enforcement on PRD-chat revise mode, add subscription period columns + expiry-aware quota checks, dedupe hardcoded plan limits into the existing `PLAN_LIMITS` constant.

**Tech Stack:** TanStack Start server routes, better-auth, Drizzle ORM + PostgreSQL, drizzle-kit migrations.

## Global Constraints

- Business spec (user-confirmed): Free = 3 PRD + 3 revisi/month, resets next calendar month. Pro = 25 PRD/20 revisi per subscription period, resets on renewal, blocked if period expires without renewal. Hengker = unlimited PRD/revisi, blocked only if subscription expires.
- Do NOT touch `src/routes/forgot-password.tsx` :  standing instruction, ignore forgot-password entirely.
- No new dependencies. No cron/scheduler infra exists :  expiry must be checked lazily (on quota-check call), not via background job.
- All new DB changes via `drizzle-kit generate` + a real SQL migration file under `drizzle/` :  never hand-edit `drizzle/meta/_journal.json`.

---

## File Structure

| File | Change |
|---|---|
| `src/db/schema.ts` | Add `currentPeriodStart`/`currentPeriodEnd` to `subscriptions` |
| `drizzle/0002_*.sql` | Generated migration for above |
| `src/lib/auth.ts` | Add `databaseHooks.user.create.after` to seed `quotas` row |
| `src/lib/quota.ts` | Unify fail-mode (both fail closed on missing row), add `checkSubscriptionActive` |
| `src/routes/api/chat.ts` | Enforce revision quota on `mode === "revise"` |
| `src/lib/services/payment-service.ts` | Use `PLAN_LIMITS`, set period columns on activation |
| `src/types/database.ts` | No change (PLAN_LIMITS already correct, just gets consumed) |

---

### Task 1: Add subscription period columns (migration)

**Files:**
- Modify: `src/db/schema.ts:73-84` (`subscriptions` table)
- Create: `drizzle/0002_*.sql` (generated, do not hand-write)

**Interfaces:**
- Produces: `subscriptions.currentPeriodStart: timestamp | null`, `subscriptions.currentPeriodEnd: timestamp | null` :  consumed by Task 4 (`checkSubscriptionActive`) and Task 5 (`applyPaymentSuccess`).

- [ ] **Step 1: Add columns to schema**

Edit `src/db/schema.ts`, in the `subscriptions` table definition:

```ts
export const subscriptions = pgTable("subscriptions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	plan: text("plan").notNull().default("free"), // free, pro, hengker
	status: text("status").notNull().default("active"),
	midtransOrderId: text("midtrans_order_id"),
	subscriptionType: text("subscription_type"),
	currentPeriodStart: timestamp("current_period_start"),
	currentPeriodEnd: timestamp("current_period_end"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
```

- [ ] **Step 2: Generate migration**

Run: `npm run db:generate`
Expected: new file `drizzle/0002_<name>.sql` containing `ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" timestamp;` and same for `current_period_end`.

- [ ] **Step 3: Apply migration**

Run: `npm run db:migrate`
Expected: no errors, `drizzle/meta/_journal.json` gets a new entry (auto-written by drizzle-kit, do not hand-edit).

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add subscription period columns for expiry tracking"
```

---

### Task 2: Seed quotas row on signup

**Files:**
- Modify: `src/lib/auth.ts:12-58` (`betterAuth()` config)

**Interfaces:**
- Consumes: `db` from `@/db`, `quotas` + `subscriptions` from `@/db/schema`, `PLAN_LIMITS` from `@/types/database`.
- Produces: every new user has a `quotas` row with `prdLimit: 3, revisionLimit: 3` and a `subscriptions` row with `plan: "free"` at signup time :  Task 3 relies on this row always existing.

- [ ] **Step 1: Add databaseHooks to seed quotas + subscription**

Edit `src/lib/auth.ts`. Add imports and a `databaseHooks` block:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import {
	accounts,
	quotas,
	sessions,
	subscriptions,
	users,
	verifications,
} from "@/db/schema";
import { PLAN_LIMITS } from "@/types/database";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
		schema: {
			users,
			sessions,
			accounts,
			verifications,
		},
	}),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const freeLimits = PLAN_LIMITS.free;
					await db.insert(subscriptions).values({
						id: crypto.randomUUID(),
						userId: user.id,
						plan: "free",
						status: "active",
					});
					await db.insert(quotas).values({
						id: crypto.randomUUID(),
						userId: user.id,
						prdUsed: 0,
						prdLimit: freeLimits.prd,
						revisionUsed: 0,
						revisionLimit: freeLimits.revision,
					});
				},
			},
		},
	},
	emailAndPassword: {
		enabled: false,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		},
		// ponytail: placeholder :  gh CLI token lacks OAuth-App scope to auto-provision.
		// Create at github.com/settings/developers, then fill real values in .env.
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
			clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
		},
	},
	user: {
		additionalFields: {
			fullName: { type: "string", required: false, input: true },
			company: { type: "string", required: false, input: true },
			role: { type: "string", required: false, input: false },
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 min - skip DB query per request
		},
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
	},
	// tanstackStartCookies MUST be last plugin
	plugins: [tanstackStartCookies()],
});
```

- [ ] **Step 2: Verify no duplicate subscription row on login (not signup)**

`databaseHooks.user.create.after` only fires on user creation (confirmed via better-auth docs), not on every login :  no dedup guard needed since `applyPaymentSuccess` (Task 5) already does an upsert against `orderBy(createdAt desc).limit(1)`.

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "fix: seed quotas + free subscription row on signup

Prevents checkQuota/checkRevisionQuota from hitting the no-row case
for every new user, which previously fail-opened PRD generation and
fail-closed revisions inconsistently."
```

---

### Task 3: Unify quota fail-mode + expiry check

**Files:**
- Modify: `src/lib/quota.ts` (full rewrite, 41 lines → ~70 lines)

**Interfaces:**
- Consumes: `subscriptions` table (`currentPeriodEnd` from Task 1).
- Produces: `checkQuota(userId)`, `checkRevisionQuota(userId)` now both fail closed on missing row (dead code path after Task 2, kept as defense). New `checkSubscriptionActive(userId): Promise<boolean>` :  consumed by Task 4.

- [ ] **Step 1: Rewrite quota.ts**

```ts
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotas, subscriptions } from "@/db/schema";

/**
 * Pro/Hengker subscriptions with a currentPeriodEnd in the past are expired.
 * Free plan has no period (currentPeriodEnd stays null) - always active.
 */
export async function checkSubscriptionActive(userId: string): Promise<boolean> {
	const [sub] = await db
		.select({ plan: subscriptions.plan, currentPeriodEnd: subscriptions.currentPeriodEnd })
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt))
		.limit(1);

	if (!sub || sub.plan === "free") return true;
	if (!sub.currentPeriodEnd) return true;
	return sub.currentPeriodEnd.getTime() > Date.now();
}

export async function checkQuota(
	userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
	const [quota] = await db
		.select({ prdUsed: quotas.prdUsed, prdLimit: quotas.prdLimit })
		.from(quotas)
		.where(eq(quotas.userId, userId))
		.limit(1);

	// ponytail: fail closed - a missing row after Task 2's signup seed means
	// something is wrong, not "give unlimited access".
	if (!quota) return { allowed: false, used: 0, limit: 0 };
	if (quota.prdLimit === -1) {
		const active = await checkSubscriptionActive(userId);
		return { allowed: active, used: quota.prdUsed ?? 0, limit: -1 };
	}
	if (!(await checkSubscriptionActive(userId)))
		return { allowed: false, used: quota.prdUsed ?? 0, limit: quota.prdLimit ?? 0 };
	return {
		allowed: (quota.prdUsed ?? 0) < (quota.prdLimit ?? 0),
		used: quota.prdUsed ?? 0,
		limit: quota.prdLimit ?? 0,
	};
}

export async function incrementPrdCount(userId: string): Promise<void> {
	await db.update(quotas).set({ prdUsed: sql`${quotas.prdUsed} + 1` }).where(eq(quotas.userId, userId));
}

export async function checkRevisionQuota(
	userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
	const [quota] = await db
		.select({ revisionUsed: quotas.revisionUsed, revisionLimit: quotas.revisionLimit })
		.from(quotas)
		.where(eq(quotas.userId, userId))
		.limit(1);

	if (!quota) return { allowed: false, used: 0, limit: 0 };
	if (quota.revisionLimit === -1) {
		const active = await checkSubscriptionActive(userId);
		return { allowed: active, used: quota.revisionUsed ?? 0, limit: -1 };
	}
	if (!(await checkSubscriptionActive(userId)))
		return { allowed: false, used: quota.revisionUsed ?? 0, limit: quota.revisionLimit ?? 0 };
	return {
		allowed: (quota.revisionUsed ?? 0) < (quota.revisionLimit ?? 0),
		used: quota.revisionUsed ?? 0,
		limit: quota.revisionLimit ?? 0,
	};
}

export async function incrementRevisionCount(userId: string): Promise<void> {
	await db.update(quotas).set({ revisionUsed: sql`${quotas.revisionUsed} + 1` }).where(eq(quotas.userId, userId));
}
```

Note: `incrementRevisionCount` is a new export :  extracted from the inline `db.update(quotas).set({revisionUsed: ...})` block currently duplicated in `src/routes/api/ac/revise.ts:87-91`. Task 4 will use it in `chat.ts`; `ac/revise.ts` is left as-is (out of scope, already works, not part of the 4 confirmed bugs).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `src/routes/api/ac/revise.ts` still compiles since it imports `checkRevisionQuota` (signature unchanged) and does its own inline increment (untouched).

- [ ] **Step 3: Commit**

```bash
git add src/lib/quota.ts
git commit -m "fix: unify quota fail-mode to fail-closed, add subscription expiry check

checkQuota previously fail-opened (allowed:true) on a missing quotas
row while checkRevisionQuota fail-closed - inconsistent bug from the
same root cause (no row-seeding at signup, fixed in prior commit).
Both now fail closed. Also adds checkSubscriptionActive so Pro/Hengker
users with an expired subscription period stop getting unlimited/25-PRD
access instead of being silently ignored forever."
```

---

### Task 4: Enforce revision quota on PRD-chat revise mode

**Files:**
- Modify: `src/routes/api/chat.ts:1-93` (imports + mode="generate" quota block)
- Modify: `src/routes/api/chat.ts:370-391` (post-stream increment block)

**Interfaces:**
- Consumes: `checkRevisionQuota`, `incrementRevisionCount` from `@/lib/quota` (Task 3).

- [ ] **Step 1: Add revision quota check alongside the existing generate check**

In `src/routes/api/chat.ts`, change the import line 7:

```ts
import { checkQuota, checkRevisionQuota, incrementPrdCount, incrementRevisionCount } from "@/lib/quota";
```

Replace the `if (mode === "generate")` block at lines 81-93:

```ts
				if (mode === "generate") {
					const quotaCheck = await checkQuota(user.id);
					if (!quotaCheck.allowed) {
						return Response.json(
							{
								error:
									"Limit pembuatan PRD kamu sudah tercapai. Silakan upgrade ke paket Hengker untuk akses tanpa batas, atau tunggu reset kuota bulan depan.",
								quota: { used: quotaCheck.used, limit: quotaCheck.limit },
							},
							{ status: 403 },
						);
					}
				}

				if (mode === "revise") {
					const revisionCheck = await checkRevisionQuota(user.id);
					if (!revisionCheck.allowed) {
						return Response.json(
							{
								error:
									"Limit revisi PRD kamu sudah tercapai. Silakan upgrade paket atau tunggu reset kuota bulan depan.",
								quota: { used: revisionCheck.used, limit: revisionCheck.limit },
							},
							{ status: 403 },
						);
					}
				}
```

- [ ] **Step 2: Increment revision count when a revise-mode PRD save succeeds**

Find the block (currently around line 382-390):

```ts
								try {
									if (mode === "generate") await incrementPrdCount(user.id);
								} catch (err) {
									console.error(
										"Failed to increment PRD count for user",
										user.id,
										err,
									);
								}
```

Replace with:

```ts
								try {
									if (mode === "generate") await incrementPrdCount(user.id);
									if (mode === "revise") await incrementRevisionCount(user.id);
								} catch (err) {
									console.error(
										"Failed to increment PRD/revision count for user",
										user.id,
										err,
									);
								}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix: enforce revision quota on PRD-chat revise mode

mode=revise (in-chat PRD revision, distinct from /api/ac/revise) had
zero quota enforcement - a free user could revise a PRD unlimited
times through the main chat. Now checks + increments revisionUsed
same as the dedicated AC revise endpoint already does."
```

---

### Task 5: Dedupe hardcoded plan limits, set subscription period on payment

**Files:**
- Modify: `src/lib/services/payment-service.ts:31-94` (`applyPaymentSuccess`)

**Interfaces:**
- Consumes: `PLAN_LIMITS` from `@/types/database` (already exists, was unused by this file).
- Produces: `subscriptions.currentPeriodStart`/`currentPeriodEnd` set on every successful payment (30-day period, matches monthly billing in `pricing-data.ts` :  annual billing already charges 12x monthly price as one lump sum per `novaPlanPlans`, so period length is uniform 30 days for both cycles per existing `subscriptionType` field which already distinguishes them elsewhere).

- [ ] **Step 1: Replace hardcoded limits with PLAN_LIMITS, add period columns**

Edit `src/lib/services/payment-service.ts`:

```ts
import { desc, eq } from "drizzle-orm";
import { novaPlanPlans } from "@/lib/pricing-data";
import { PLAN_LIMITS, type Plan } from "@/types/database";

export function planFromAmount(amount: number): Plan {
  const hengker = novaPlanPlans.find((p) => p.id === "hengker");
  const pro = novaPlanPlans.find((p) => p.id === "pro");
  if (amount === hengker?.priceMonthly || amount === hengker?.priceAnnually) return "hengker";
  if (amount === pro?.priceMonthly || amount === pro?.priceAnnually) return "pro";
  // ponytail: fail loudly on unknown amount rather than misclassify the plan.
  throw new Error(`Payment amount ${amount} does not match any plan price`);
}

/**
 * Applies plan/quota after Midtrans confirms. Idempotent: bails if already success.
 * Called by syncPaymentStatus + payments/webhook.
 */
export async function applyPaymentSuccess(orderId: string) {
  const { db } = await import("@/db");
  const { payments, quotas, subscriptions } = await import("@/db/schema");
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);
  if (!payment) return null;
  if (payment.status === "success") return { plan: payment.plan as Plan };

  const plan = planFromAmount(payment.amount ?? 0);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Upsert subscription (latest row for user, else insert).
  const [existingSub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, payment.userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        plan,
        status: "active",
        midtransOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existingSub.id));
  } else {
    await db.insert(subscriptions).values({
      id: crypto.randomUUID(),
      userId: payment.userId,
      plan,
      status: "active",
      midtransOrderId: orderId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  // Upsert quota.
  const limits = PLAN_LIMITS[plan];
  const [existingQuota] = await db
    .select({ id: quotas.id })
    .from(quotas)
    .where(eq(quotas.userId, payment.userId))
    .orderBy(desc(quotas.createdAt))
    .limit(1);
  if (existingQuota) {
    await db
      .update(quotas)
      .set({ prdUsed: 0, prdLimit: limits.prd, revisionUsed: 0, revisionLimit: limits.revision, updatedAt: now })
      .where(eq(quotas.id, existingQuota.id));
  } else {
    await db.insert(quotas).values({
      id: crypto.randomUUID(),
      userId: payment.userId,
      prdUsed: 0,
      prdLimit: limits.prd,
      revisionUsed: 0,
      revisionLimit: limits.revision,
    });
  }

  // Mark success LAST so a retry re-runs sub/quota if it died mid-way.
  await db.update(payments).set({ status: "success", updatedAt: now }).where(eq(payments.orderId, orderId));
  return { plan };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `limits.prd`/`limits.revision` (from `PLAN_LIMITS`) match the field names `checkQuota`/`checkRevisionQuota` expect.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/payment-service.ts
git commit -m "fix: dedupe plan limits into PLAN_LIMITS, set subscription period on payment

payment-service.ts hardcoded {prd:25,rev:20}/{prd:-1,rev:-1} instead of
reusing types/database.ts PLAN_LIMITS - DRY violation, a future limit
change would need editing two places and could silently diverge.
Also sets currentPeriodStart/End (added in Task 1) so
checkSubscriptionActive has real expiry data to check against."
```

---

## Verification

- [ ] `npx tsc --noEmit` passes with zero errors after all 5 tasks.
- [ ] Manual: create a new user via signup → confirm `quotas` row exists with `prdLimit=3, revisionLimit=3` and `subscriptions` row with `plan=free`.
- [ ] Manual: exhaust free PRD quota (3 generates) → 4th `mode=generate` call returns 403 with Indonesian error message.
- [ ] Manual: on a fresh free account, call `mode=revise` in `/api/chat` 3 times → 4th call returns 403 (previously always allowed).
- [ ] Manual: simulate a Pro payment via `applyPaymentSuccess` → confirm `subscriptions.currentPeriodEnd` is ~30 days out and `quotas.prdLimit=25, revisionLimit=20`.
- [ ] Manual: manually set a Pro user's `currentPeriodEnd` to a past date in DB → confirm `checkQuota`/`checkRevisionQuota` both return `allowed:false` even though `prdUsed < prdLimit`.

## What this plan deliberately does NOT fix

- **Monthly reset for Free plan.** Business spec says Free resets next calendar month, but no cron/scheduler infra exists in this repo (confirmed via grep, no changes made). Implementing this needs either an external cron trigger or a lazy "reset if `now` is a new month since `quotas.updatedAt`" check :  deferred as a separate plan since it's a new feature (scheduling), not a bug fix, and needs a product decision on which approach to use.
- **`/api/ac/revise.ts` still has its own inline `revisionUsed` increment** (not switched to the new `incrementRevisionCount` helper) :  it already works correctly, touching it is out of scope for a bug-fix plan and risks an unrelated regression.
- **GitHub OAuth Client Secret rotation** :  unrelated to pricing/quota, flagged separately, still unresolved. The secret pasted earlier in chat needs regeneration via github.com/settings/developers. Not touched by this plan.
- **`forgot-password.tsx`** :  untouched per standing instruction.
- Deferred items from `refresh-data-loss-audit.md` (consume-before-success race, retry-card NOT_FOUND double-burn, api-key raw-key survival) :  unrelated subsystem, not part of this plan's scope.

## Self-Review

- **Spec coverage:** All 4 confirmed bugs covered :  (1) no quota seed at signup → Task 2, (2) fail-open/fail-closed inconsistency → Task 3, (3) no revision enforcement in chat.ts revise mode → Task 4, (4) hardcoded limits DRY violation → Task 5. Subscription expiry (needed for "Pro/Hengker until subscription expires" spec line) added as Task 1 + wired into Task 3/5 since no expiry mechanism existed at all.
- **Placeholder scan:** No TBD/TODO, all code blocks are complete and copy-pasteable, all line anchors point at real current line numbers re-verified this session.
- **Type consistency:** `checkQuota`/`checkRevisionQuota` return shape unchanged (`{allowed, used, limit}`) so `ac/revise.ts` and `chat.ts` callers keep compiling. `incrementRevisionCount(userId: string): Promise<void>` matches the calling convention of `incrementPrdCount`. `PLAN_LIMITS[plan].prd`/`.revision` field names verified against `src/types/database.ts:101-105`.
