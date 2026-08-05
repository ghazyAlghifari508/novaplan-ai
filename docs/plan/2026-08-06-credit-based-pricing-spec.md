# Credit-Based Pricing — Design Spec

> Replaces current monthly/annual subscription model with credit-per-project model.

## Decision Log

- **Billing model:** Credit per project (Approach A — approved)
- **1 credit = 1 full project lifecycle** (prompt → question → PRD → AC → Task → implementasi)
- **Revisi unlimited** within active project (no additional credit cost)
- **Credits never expire**
- **No top-up pack** (removed — created pricing ambiguity)
- **Target market:** Universal (developer, PM, vibecoder)

## Tier Structure

| Tier | Price (IDR) | Credits | Model Access | Key Differentiator |
|------|-------------|---------|--------------|-------------------|
| Free | 0 | 2 (lifetime) | Ling 3.0 Flash, Big Pickle | PRD only — AC/Task/Kanban locked |
| Pro | 49,000 | 10 | + Nemotron 3 Ultra, MiMo v2.5 | Full workflow (PRD+AC+Task+Kanban) |
| Hengker | 149,000 | 35 | + DeepSeek v4 Flash + priority queue | Full workflow + premium model + priority |

Per-project cost: Free=0, Pro≈Rp4,900, Hengker≈Rp4,260.

## Feature Matrix (from codebase audit)

| Feature | Free | Pro | Hengker |
|---------|------|-----|---------|
| PRD generate | ✅ | ✅ | ✅ |
| AC generate | ❌ → pricing modal | ✅ | ✅ |
| Task generate | ❌ → pricing modal | ✅ | ✅ |
| Kanban board | ❌ → pricing modal | ✅ | ✅ |
| Revisi PRD | ✅ unlimited | ✅ unlimited | ✅ unlimited |
| Model: Ling 3.0 Flash | ✅ | ✅ | ✅ |
| Model: Big Pickle | ✅ | ✅ | ✅ |
| Model: Nemotron 3 Ultra | ❌ | ✅ | ✅ |
| Model: MiMo v2.5 | ❌ | ✅ | ✅ |
| Model: DeepSeek v4 Flash | ❌ | ❌ | ✅ |
| Export Markdown | ✅ | ✅ | ✅ |
| Share Link | ❌ | ✅ | ✅ |
| Version History | ❌ | 30 versions | Unlimited |
| Priority Queue | ❌ | ❌ | ✅ |

## Upgrade Triggers

**Free → Pro/Hengker:** User clicks any locked action (Generate AC, Generate Task, open Kanban, Share Link) → PricingModal appears inline (not redirect to /pricing page).

**Pro → Hengker:** User exhausts 10 credits → PricingModal appears on next project creation attempt. Can buy Pro again (10 credits) or upgrade to Hengker (35 credits + premium model + priority).

## PricingModal Component

- Shows all 3 tiers side-by-side (same layout as pricing page, but inline modal)
- Free tier shown as "current" for free users (disabled button)
- Pro/Hengker: "Beli" button → Midtrans Snap popup
- On payment success: credits added, tier upgraded, modal auto-closes, original action continues (e.g., auto-generate AC)

## Payment Flow

```
User clicks locked action (Free tier)
  → PricingModal appears
  → User selects Pro (Rp 49K) or Hengker (Rp 149K)
  → POST /api/payments/create { planId: "pro"|"hengker" }  (no cycle param — one-time)
  → Midtrans Snap popup (QRIS, VA, e-wallet, CC)
  → Payment success webhook
  → applyPaymentSuccess: subscription.plan updated, credits set
  → Modal auto-close → action continues
```

**Change from current:** Remove `cycle` param (monthly/annually) — all payments are one-time credit purchases.

## Database Schema Changes

### subscriptions table (modify)

```sql
-- Remove: subscriptionType, currentPeriodStart, currentPeriodEnd
-- Add: credits (integer, default 0), creditsUsed (integer, default 0)
```

| Column | Type | Change |
|--------|------|--------|
| plan | text | Keep — tier identifier |
| status | text | Keep — "active" |
| midtransOrderId | text | Keep |
| subscriptionType | text | **REMOVE** |
| currentPeriodStart | timestamp | **REMOVE** |
| currentPeriodEnd | timestamp | **REMOVE** |
| credits | integer | **ADD** — total credits purchased |
| creditsUsed | integer | **ADD** — credits consumed |

### quotas table (repurpose or remove)

Current: prdUsed/prdLimit, revisionUsed/revisionLimit.
New model: revision is unlimited, PRD limit is per-credit not per-month.

**Option:** Keep quotas table for backward compat, repurpose as credit ledger:
- `prdUsed` → `creditsUsed` (total projects created)
- `prdLimit` → `creditsTotal` (total credits owned)
- `revisionUsed`/`revisionLimit` → unused (revisions unlimited)

**Simpler option:** Drop quotas table, track credits in subscriptions table directly.

**Decision:** Add `credits` + `creditsUsed` to subscriptions table. Keep quotas table for now (existing data), stop writing to it for new purchases. Migrate existing quota data to subscriptions credits in a future cleanup.

### payments table (modify)

| Column | Type | Change |
|--------|------|--------|
| orderId | text | Keep |
| plan | text | Keep |
| amount | integer | Keep |
| status | text | Keep |
| midtransResponse | jsonb | Keep |

No schema changes needed — payment records stay as-is. Just stop using `cycle` in create route.

## Code Changes Required

### 1. `src/types/database.ts`
- Change `PLAN_LIMITS` from `{prd, revision}` to `{credits: number}`
- Update `FEATURES` — remove versionHistory days, add new flags
- Fix stale TS interfaces (Subscription, Quota, Payment)

### 2. `src/lib/quota.ts`
- Replace `checkQuota` → `checkCredits(userId)` — checks `creditsUsed < credits` in subscriptions
- Replace `incrementPrdCount` → `incrementCreditUsage(userId)` — atomic `creditsUsed + 1`
- Remove `checkRevisionQuota` / `incrementRevisionCount` (revisions unlimited)
- Remove `checkSubscriptionActive` period check (no expiry)

### 3. `src/lib/services/payment-service.ts`
- `planFromAmount` — remove annual prices, only match monthly
- `applyPaymentSuccess` — set `credits` + `creditsUsed: 0` based on tier, remove period logic
- Remove `currentPeriodStart`/`End` logic entirely

### 4. `src/routes/api/payments/create.ts`
- Remove `cycle` param validation
- Remove annual pricing logic
- Simplify to one-time purchase only

### 5. `src/routes/api/ac/generate.ts` (BUG FIX — currently no quota gate)
- Add `checkCredits(userId)` before generation
- Add `incrementCreditUsage(userId)` after successful generation
- Return 403 with pricing modal trigger when no credits

### 6. `src/routes/api/task/generate.ts` (BUG FIX — currently no quota gate)
- Same as ac/generate — add credit check + increment

### 7. `src/routes/api/chat.ts`
- Replace `checkQuota` → `checkCredits`
- Replace `incrementPrdCount` → `incrementCreditUsage`
- Remove revision quota checks (unlimited)
- Only credit-check on project creation (first PRD), not on revision

### 8. `src/routes/api/ac/revise.ts` (BUG FIX — no increment)
- Remove revision quota check (unlimited revisions)
- Remove increment call (was missing anyway)

### 9. `src/components/pricing/PricingModal.tsx` (NEW)
- Inline modal with 3 tier cards
- Triggered by locked actions
- Integrates with Midtrans Snap
- Auto-continues original action on success

### 10. `src/components/chat/limit-modal.tsx` (MODIFY)
- Change from "Limit Tercapai" to "Kredit Habis"
- Show current tier + credit count
- Trigger PricingModal instead of redirect to /pricing

### 11. `src/routes/settings/billing.tsx`
- Show credit balance (X of Y used)
- Remove billing cycle display
- Remove period dates
- Add "Beli Kredit" button → PricingModal

### 12. `src/components/ui/pricing-card.tsx`
- Remove monthly/annually toggle
- Show credit-based pricing
- Update feature list per new matrix

### 13. `src/lib/pricing-data.ts`
- Remove `priceMonthly`/`priceAnnually` → single `price` field
- Update feature lists per new matrix
- Remove cycle-related types

### 14. `src/components/prd/version-history.tsx`
- Free tier: show version history (was locked, now credit gates access instead)
- Keep versionHistory feature flag but simplify (boolean, not day-count)

### 15. `src/lib/model-config.ts`
- No changes needed — model definitions already correct (Ling/BigPickle free, Nemotron/MiMo pro, DeepSeek hengker)

## Audit Findings to Fix During Implementation

### Critical
1. **AC/Task generate no quota gate** — users can generate unlimited without credits
2. **Annual billing 30-day expiry bug** — removed entirely (no more billing cycles)

### Important
3. **AC revise no increment** — revision quota checked but never incremented
4. **Webhook gross_amount not verified** — add amount verification in webhook handler

### Cleanup
5. **Stale TS interfaces** — Subscription, Quota, Payment types don't match schema
6. **Dual plan source** — server fn + API route return different data; consolidate
