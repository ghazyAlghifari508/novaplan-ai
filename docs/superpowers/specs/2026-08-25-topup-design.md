# Top-Up Kredit Mid-Period — Design Spec

**Date:** 2026-08-25
**Status:** Draft — awaiting user approval
**Scope:** Paket top-up kredit tunggal (15 kredit / Rp 20.000) yang bisa dibeli user pro/hengker **saat langganan masih aktif**, tanpa memperpanjang masa aktif. Kredit masuk ke kolam yang sama, hangus bersama di akhir periode berjalan, dibatasi kuota per periode.
**Out of scope:** Auto-charge / Midtrans Subscription API, proration, pool kredit kedua dengan umur berbeda, refund otomatis, perubahan aturan hangus, perubahan harga paket bulanan.

**Tech Stack:** TanStack Start + TanStack Router (file-based `src/routes/`), React 19, Drizzle ORM + PostgreSQL 17, Midtrans Snap (existing), Vitest, Biome, pnpm, deploy di Vercel. **Tanpa dependency baru.**

**Spec induk:** `docs/superpowers/specs/2026-08-25-monthly-pricing-design.md` (model langganan bulanan yang sedang berjalan).

---

## 1. Goal & Success Criteria

**Goal:** Beri jalan keluar bagi user aktif yang kreditnya habis di tengah periode — mereka bisa membeli tambahan kredit dengan harga per-kredit lebih murah dari paket bulanan, **tanpa** menggeser periode dan tanpa membuka celah menggerogoti nilai langganan.

**Keputusan owner (FINAL, tidak dibuka lagi):**

| Aspek | Keputusan |
|---|---|
| SKU | **Satu SKU universal**: 15 kredit / Rp 20.000 (±Rp 1.333/kredit; pembanding: Pro ±Rp 1.633/kredit, Hengker ±Rp 1.419/kredit) |
| Eligibility | HANYA state efektif `active_paid` (plan pro/hengker + periode berjalan). `paused` harus renew; free & legacy tidak bisa |
| Kolam kredit | Satu kolam dengan kredit bulanan (`credits`/`creditsUsed` sama); sisa top-up **hangus bareng** di akhir periode |
| Cap anti-undercut | Total kredit top-up sukses per periode ≤ alokasi plan (Pro 30, Hengker 105); kuota reset saat periode berganti |
| Masa aktif | Top-up **TIDAK pernah** menyentuh `current_period_start/end`, `plan`, `status`, `cancelled_at`, `reminder_count` |

**Success criteria (measurable):**
- Webhook top-up idempotent: retry/dobel notifikasi Midtrans tidak pernah menambah kredit dua kali untuk satu order.
- Setelah top-up sukses: `credits` bertambah tepat `+15`, semua kolom periode/plan **bit-for-bit tidak berubah**.
- User `paused`, `free_active`, atau `legacy_grandfathered` mendapat HTTP 403 saat mencoba membuat order top-up (baik lewat UI maupun POST langsung).
- Kuota cap terlihat benar: setelah mencapai batas, checkout berikutnya ditolak dengan pesan Bahasa Indonesia yang menjelaskan batasnya.
- Tidak ada migrasi skema dan tidak ada env baru; deploy = push aplikasi saja.

---

## 2. Global Constraints (berlaku untuk semua task)

- TanStack Start file-based routing di `src/routes/`. Bukan Next.js.
- Server-only (`db`, SDK eksternal): dynamic import di dalam handler/server fn bila modul di-import client; API routes boleh top-level `import { db }` (pola existing).
- **`src/lib/billing.ts` tetap pure (zero import `@/db`)** — seluruh logika keputusan baru (eligibility, sisa kuota) hidup di sini agar unit-testable tanpa DB.
- `src/lib/credits.ts` **tidak disentuh sama sekali**: kredit top-up masuk kolam yang sama sehingga `consumeCredit`/`getCreditBalance`/`checkCredits` bekerja apa adanya (verifikasi: predikat atomicity existing tidak boleh berubah).
- No hardcode: ID SKU, jumlah kredit, dan harga top-up hidup sebagai konstanta di `src/lib/constants.ts`.
- UI copy Bahasa Indonesia; istilah teknis English. Commit message English conventional.
- Idempotensi pembayaran: pola "mark success LAST" + guard `payment.status === "success"` bail + `SELECT … FOR UPDATE` dipertahankan.
- YAGNI: tanpa auto-charge, tanpa proration, tanpa pool kedua, tanpa refund otomatis.

---

## 3. Architecture Overview

Pendekatan: **order top-up = row `payments` dengan plan khusus + jalur grant aditif terpisah, dirouting oleh dispatcher tunggal di service layer.**

```
 UI (/pricing, credit-exhausted-modal, billing)
   │  POST /api/payments/create { planId: "topup-15" }
   ▼
 create.ts ── pre-check eligibility (active_paid?) + cap (kuota cukup?)
   │         orderId = TOPUP-… ; payments.plan = "topup-15"
   ▼
 Midtrans Snap (existing flow, item "Top Up 15 Kredit")
   │
   ├─ webhook settlement/capture ─────────────┐
   ├─ redirect back → syncPaymentStatus ──────┤
   ▼                                          ▼
              applyOrderSuccess(orderId)        ← DISPATCHER (baru)
                ├── payments.plan === TOPUP_SKU.id
                │     → applyTopUpSuccess      ← ADDITIF (baru)
                │       re-validate active_paid → credits += 15
                └── else
                      → applyPaymentSuccess    ← SET (existing, tak tersentuh)
```

Prinsip kunci:

1. **Routing dipusatkan, bukan tersebar.** Saat ini `applyPaymentSuccess` dipanggil dari 2 tempat: `webhook.ts:48` dan `syncPaymentStatus` (`app/actions/payment.ts:62`). Keduanya diganti memanggil dispatcher `applyOrderSuccess`. Ini wajib: nominal Rp 20.000 membuat `planFromAmount` throw (`payment-service.ts:22-23`), jadi kalau salah satu jalur lolos ke fungsi lama, pembayaran valid akan gagal diproses.
2. **Discriminator resmi = `payments.plan === TOPUP_SKU.id`**, bukan string-matching prefix order_id. Prefix `TOPUP-…` pada orderId tetap dipakai, tapi hanya untuk keterbacaan di dashboard Midtrans/log — bukan cabang logika.
3. **Top-up tidak pernah menyentuh mesin periode.** Semua fungsi pure periode existing (`resolveSubscriptionState`, `computePurchaseGrant`, rollover free) tidak berubah; top-up hanya `credits += N`.

---

## 4. Data Model

**Tidak ada perubahan skema** — fitur ini sengaja dirancang zero-migration:

| Tabel | Pemakaian |
|---|---|
| `payments` (schema.ts:356) | Row top-up disimpan seperti pembayaran biasa: `orderId` = `TOPUP-{ts}-{hex}`, **`plan` = `"topup-15"`** (nilai konstanta `TOPUP_SKU.id`, bukan angka), `amount` = `20000`, `status` siklus pending→success/failed sama seperti existing. Kolom `plan` inilah diskriminator routing DAN sumber hitung kuota cap |
| `subscriptions` (schema.ts:83) | Hanya `credits` yang pernah di-mutate (`+= 15`) oleh grant aditif. Kolom lain tidak disentuh |

Cap dihitung dari riwayat pembayaran, bukan kolom baru:

```sql
-- getTopUpCreditsUsedThisPeriod(userId) — payment-service.ts
SELECT COUNT(*) FROM payments
WHERE user_id = :userId
  AND status = 'success'
  AND plan = :TOPUP_SKU.id          -- 'topup-15', sukses-only
  AND created_at >= :currentPeriodStart
  AND created_at <= :currentPeriodEnd
-- usedThisPeriod = COUNT(*) × TOPUP_SKU.credits
```

Batas periode dibaca dari row `subscriptions` TERAKHIR milik user (pola `ORDER BY created_at DESC LIMIT 1` yang sudah jadi konvensi hot path).

---

## 5. Logika Inti

### 5.1 Konstanta (`src/lib/constants.ts`)

```ts
// === Credit top-up (mid-period purchase) ===
// Single universal SKU: bought by active Pro/Hengker subscribers only.
// Credits join the SAME pool as the monthly allocation (shared credits /
// creditsUsed) and are forfeited together at period end. Buying NEVER
// extends the current period.
export const TOPUP_SKU = {
	id: "topup-15",
	credits: 15,
	priceIdr: 20000,
} as const;
```

### 5.2 Helper pure baru di `src/lib/billing.ts` (zero import db)

```ts
/** Top-up is exclusive to an ACTIVE paid subscription (spec §1). */
export function canPurchaseTopUp(eff: EffectiveSubscription): boolean {
	return eff.state === "active_paid";
}

/**
 * Remaining top-up allowance for the CURRENT period (spec §4 anti-undercut
 * cap): plan allocation minus successful top-up credits this period.
 * Negative inputs clamp to 0 so an over-cap history can't enable a buy.
 */
export function remainingTopUpQuota(params: {
	plan: Plan;
	usedThisPeriod: number;
}): number {
	return Math.max(0, PLAN_CREDITS[params.plan] - params.usedThisPeriod);
}
```

Catatan: `canPurchaseTopUp` otomatis menolak `legacy_grandfathered` karena state-nya bukan `active_paid` — grandfathered tidak punya periode berjalan sehingga definisi "per periode" tidak bermakna untuk mereka.

### 5.3 Grant aditif baru: `applyTopUpSuccess(orderId)` (`src/lib/services/payment-service.ts`)

Perilaku dalam satu transaksi (mengikuti pola existing):

1. `SELECT … FOR UPDATE` row payments by orderId; **bail** jika tidak ada atau `status === "success"` (idempotensi, identik existing).
2. Validasi defensif: `payment.plan` HARUS `=== TOPUP_SKU.id` dan `payment.amount === TOPUP_SKU.priceIdr`; jika tidak → return `null` (order bukan top-up/salah nominal, biarkan caller menangani).
3. **Re-validasi eligibility ketat saat grant**: baca row subscriptions terakhir, jalankan `resolveSubscriptionState(sub, now)`; jika state ≠ `active_paid` → **tolak grant**: set payments `status = 'failed'` + tulis catatan ke `midtransResponse` (`{ topupRejected: "not_active_paid" }`), console.error, return null. Dana dikembalikan manual via dashboard Midtrans (lihat §9). Keputusan: **ketat**, karena memberi kredit ke akun paused = uang user terbakar diam-diam saat periode hangus (kredit tak terlihat dan akan ter-set-over oleh renewal berikutnya).
4. **Cap saat grant = toleran (overshoot maksimal 1 SKU)**: cap ditegakkan ketat di create-time (§6.1); di grant-time TIDAK ada penolakan cap. Rasional: cap adalah guard merchandising, bukan invariant keamanan — lebih baik kuota meleset +15 kredit daripada user yang SUDAH BAYAR tidak menerima kredit dan butuh refund manual. Dua checkout konkuren bisa saja lolos pra-checkout bersamaan; hasil terburuk total top-up periode melebihi cap sebanyak satu SKU. Keputusan ini eksplisit dan final.
5. Mutasi ADDITIF tunggal:
   ```ts
   UPDATE subscriptions SET credits = credits + 15, updated_at = now
   WHERE id = <row terakhir user>
   ```
   TIDAK menyentuh `plan`, `status`, `midtransOrderId`, `currentPeriodStart/End`, `cancelledAt`, `reminderCount`, `creditsUsed`.
6. Mark success LAST (pola existing), lalu **return `{ plan }`** — `plan` dibaca ulang dari row subscriptions setelah update. Ini menjaga kontrak return `{ plan } | null` sehingga toast client ("Berhasil beli kredit untuk paket X!") dan `refetchPlan()` existing bekerja tanpa perubahan.

### 5.4 Dispatcher baru: `applyOrderSuccess(orderId)` (file yang sama)

```ts
export async function applyOrderSuccess(orderId: string) {
	const { payments } = await import("@/db/schema");
	const [row] = await db.select({ plan: payments.plan })
		.from(payments).where(eq(payments.orderId, orderId)).limit(1);
	if (!row) return applyPaymentSuccess(orderId); // unknown → jalur lama (throw semantics tetap)
	return row.plan === TOPUP_SKU.id
		? applyTopUpSuccess(orderId)
		: applyPaymentSuccess(orderId);
}
```

Dua pemanggil lama diganti: `webhook.ts:48` dan `syncPaymentStatus` (`payment.ts:62`) memanggil `applyOrderSuccess(order_id)`. Fungsi `applyPaymentSuccess` sendiri **tidak berubah satu baris pun**.

---

## 6. Flow

### 6.1 Membuat order top-up (`POST /api/payments/create`, body `{ planId: "topup-15" }`)

Di handler existing, sebelum blok lookup `prdFyPlans`, tambahkan cabang top-up:

1. `planId !== TOPUP_SKU.id` → jalur existing apa adanya.
2. Jalur top-up:
   - Ambil `getCreditBalance(user.id)`; jika `!canPurchaseTopUp(eff)` → **403** `{ error: "Top up hanya tersedia untuk langganan Pro/Hengker yang sedang aktif." }`.
   - Hitung `usedThisPeriod` (query §4) dan `remainingTopUpQuota({ plan: eff.effectivePlan, usedThisPeriod })`; jika `< TOPUP_SKU.credits` → **400** `{ error: "Kuota top-up periode ini sudah habis (maksimal {PLAN_CREDITS[plan]} kredit). Kuota reset saat periode berikutnya." }`.
   - Cleanup stale pending (>5 menit → failed): reuse blok existing.
   - Insert payments: `orderId = TOPUP-{Date.now()}-{randomBytes(4).hex}`, `plan = TOPUP_SKU.id`, `amount = TOPUP_SKU.priceIdr`, `status = 'pending'`.
   - Parameter Snap: `gross_amount = TOPUP_SKU.priceIdr`; `item_details[0] = { id: TOPUP_SKU.id, price, quantity: 1, name: "Top Up 15 Kredit PrdFy" }`; `custom_field1 = TOPUP_SKU.id`, `custom_field2 = String(TOPUP_SKU.credits)`, `custom_field3 = user.id`; callback finish & `X-Override-Notification` identik existing (webhook URL sama).
3. Respons sukses: `{ redirect_url, token }` sama seperti existing → client membuka Snap popup.

### 6.2 Penyelesaian pembayaran

- **Webhook** (`settlement`/`capture`): verifikasi signature sha512 + pencocokan `gross_amount` vs `stored.amount` (existing, bekerja untuk top-up tanpa perubahan) → `applyOrderSuccess(order_id)` → grant aditif §5.3.
- **Redirect back ke app**: `syncPaymentStatus` → verify status ke Midtrans API (existing) → `applyOrderSuccess(orderId)` → client effect existing di `pricing-card.tsx:307` melakukan `refetchPlan()` + toast + navigasi. Untuk top-up, toast akan berbunyi "Berhasil beli kredit untuk paket Pro!" (plan efektif user) — diterima apa adanya; penyempurnaan copy spesifik top-up tidak wajib.
- **Expire/cancel Midtrans**: blok existing menandai payments `failed` — otomatis berlaku untuk order `TOPUP-*`.

### 6.3 Reset kuota

Tidak ada aksi reset eksplisit: window `created_at ∈ [periodStart, periodEnd]` bergeser sendiri saat periode baru dimulai (renewal/rollover), sehingga `usedThisPeriod` otomatis kembali 0.

---

## 7. UI Changes

Sumber kebenaran visibility: `useUserPlan().data.subscriptionState` (server truth), bukan inferensi dari sisa kredit.

Komponen baru **`TopUpCard`** (`src/components/ui/top-up-card.tsx`): kartu ringkas — judul "Top Up Kredit", "15 kredit · Rp 20.000", dua baris disclaimer wajib: *"Tanpa menambah masa aktif"* dan *"Sisa kredit ikut hangus di akhir periode berjalan"*, tombol "Top Up Sekarang". Tombol memanggil `fetch("/api/payments/create", { body: JSON.stringify({ planId: "topup-15" }) })` lalu redirect ke `redirect_url` (pola `pricing-card.tsx:344`). Komponen menerima prop `hidden?: boolean`; pemanggil yang memutuskan visibilitas.

| Lokasi | Perubahan |
|---|---|
| `/pricing` (`routes/pricing.tsx`) | Render `TopUpCard` DI DALAM wrapper pricing (di bawah grid tier, sebelum footer), visible HANYA jika `subscriptionState === "active_paid"`; selain itu render `null` (free/paused/legacy tidak melihat kartu sama sekali) |
| Credit-exhausted modal (`components/chat/credit-exhausted-modal.tsx`) | Jika `subscriptionState === "active_paid"`, tampilkan `TopUpCard` DI ATAS `PricingComponent` (kasus ideal: kredit habis tapi masa aktif jalan). Jika paused → perilaku existing (kartu renewal) tanpa top-up |
| `/settings/billing` | Footer progress kredit: saat `active_paid` dan `remaining === 0`, teks existing "Kredit periode ini habis…" ditambah link inline "**atau top up 15 kredit**" menuju `/pricing#topup` (anchor di section top-up) |
| Riwayat Pembayaran (billing page) | Row top-up otomatis muncul (Rp 20.000, tanggal, badge Berhasil/Gagal) — format list existing sudah cukup, tidak ada perubahan kode |

Copy tombol & pesan error server-side (§6.1) Bahasa Indonesia; angka harga/kredit diambil dari `TOPUP_SKU`, bukan literal.

---

## 8. Edge Cases

| Kasus | Perilaku |
|---|---|
| Webhook retry / dobel notifikasi top-up | Guard `FOR UPDATE` + bail `status === 'success'` → grant sekali saja (identik existing) |
| Dua checkout top-up konkuren melewati pra-checkout cap | Grant-time toleran (§5.3 poin 4): keduanya dilayani, overshoot maksimal 1 SKU; cap tertib lagi untuk checkout berikutnya |
| Periode berakhir di antara checkout dan webhook (state berubah `active_paid` → `paused`) | Grant DITOLAK: payments `failed` + catatan `midtransResponse.topupRejected`, dana direfund manual via dashboard Midtrans (runbook di §11). Window sangat sempit (menit vs periode 30 hari) |
| User cancel / ganti jadi free setelah bayar tapi sebelum webhook | Sama dengan baris di atas — re-validasi ketat menolak |
| Legacy grandfathered mencoba top-up | Pra-checkout 403 (`state = legacy_grandfathered`); UI tidak menampilkan kartu. Alasan: tanpa periode berjalan, cap per-periode tidak terdefinisi |
| Free/paused mencoba POST langsung ke API | 403 dari pra-checkout; UI juga tidak menampilkan kartu |
| Cap persis penuh (used = alokasi) | `remainingTopUpQuota` = 0 → 400 di pra-checkout dengan pesan kuota habis |
| Nominal webhook dimanipulasi / mismatch | Verifikasi amount existing (webhook) + validasi amount vs `TOPUP_SKU.priceIdr` (grant) menolak |
| Top-up saat sisa periode < 24 jam | Diizinkan apa adanya — disclaimer UI sudah jelas bahwa sisa hangus di akhir periode (keputusan produk: jangan paternalistik) |
| Renewal dilakukan SETELAH top-up dalam periode yang sama | `applyPaymentSuccess` SET `credits = alokasi plan` — sisa top-up ikut ter-replace. Konsisten dengan tradeoff renewal yang sudah terdokumentasi di spec induk (§6.1); copy disclaimer top-up tidak perlu menyebut ini (kasus lanjutan), tapi tercatat di sini |
| Order `TOPUP-*` expire/cancel di Midtrans | Blok generic existing menandai failed; tidak ada efek ke subscriptions |

---

## 9. Refund Manual (runbook singkat, bukan kode)

Kasus grant ditolak (§8 baris ke-2/3): (1) identifikasi order di tabel `payments` dengan `status='failed'` dan `midtransResponse->topupRejected`; (2) verifikasi transaksi di dashboard Midtrans; (3) issue refund dari dashboard; (4) opsional: hubungi user via email support. Frekuensi ekspektasi: sangat jarang (window detik–menit).

---

## 10. Testing Strategy

**Unit (Vitest) — pure, tanpa DB:**
- `billing.test.ts`: `canPurchaseTopUp` — matriks 4 state (hanya `active_paid` true; termasuk kasus cancelledAt terisi dan periodEnd NULL); `remainingTopUpQuota` — 0 used, partial, persis penuh, over-cap negatif clamp ke 0.
- `payment-service.test.ts`: regression `planFromAmount` tetap throw untuk 20000 (memastikan jalur top-up tidak bocor ke mapper lama); helper `isTopUpOrder`/routing predicate (`'topup-15'` → true, `'pro'`/`'hengker'` → false, nilai tak dikenal → false).

**Integrasi ringan (pattern existing, mock/db test bila infra test memungkinkan):**
- `applyOrderSuccess` routing: order plan `topup-15` → `applyTopUpSuccess` terpanggil; order plan `pro` → jalur lama.
- `applyTopUpSuccess`: idempotent (dobel panggilan = 1x grant); additive (`credits + 15`, `creditsUsed` utuh); re-validasi menolak saat sub expired; mark-success-last.

**Regression wajib:** seluruh suite existing hijau — khususnya `billing.test.ts`, `payment-service.test.ts` (mapping harga monthly), `flow-progress.test.ts` (pre-existing failure di main TIDAK boleh bertambah jumlahnya).

**Smoke checklist Midtrans sandbox (manual QA, masuk implementation plan):**
1. Login akun pro aktif → /pricing → kartu Top Up tampil → beli → sandbox bayar → kredit +15, tanggal periode di billing page **tidak bergeser**.
2. Dobel-kirim payload webhook (retry) untuk order top-up → kredit tetap +15 sekali.
3. Akun free & paused → kartu tidak tampil; POST manual ke `/api/payments/create` dengan `planId: "topup-15"` → 403.
4. Borong cap (misal akun Pro: 2× top-up = 30 kredit) → checkout ke-3 → 400 pesan kuota habis.
5. Redirect back dari Snap → toast sukses + saldo kredit di navbar/billing ter-update (refetch).

---

## 11. Deployment Steps (urutan aman)

1. **Tidak ada migrasi skema dan tidak ada env baru** — deploy aplikasi saja (Vercel push main).
2. Koeksistensi aman: row payments lama tidak punya plan `topup-15` → dispatcher selalu jatuh ke jalur lama; perilaku existing tidak berubah.
3. Post-deploy verification: smoke checklist §10 nomor 1–3 di produksi dengan akun test + Midtrans sandbox.
4. Runbook refund manual (§9) dicatat di dokumentasi internal tim bila diperlukan.

Rollback: revert deploy aman — tidak ada perubahan DB; order top-up yang terlanjur dibuat sebelum rollback akan ditolak `planFromAmount` di jalur lama (throw → webhook 500 → Midtrans retry → tetap gagal) sehingga satu-satunya dampak adalah order in-flight tidak terproses; tangani manual via dashboard bila ada.

---

## 12. Open Questions

Tidak ada — seluruh pertentangan fakta kode vs dokumen konteks telah diselesaikan selama verifikasi: (1) routing dipusatkan via `applyOrderSuccess` karena `applyPaymentSuccess` dipanggil dari 2 lokasi (bukan hanya webhook); (2) riwayat pembayaran billing page ternyata tidak menampilkan label plan, sehingga tidak ada mapping label tambahan yang diperlukan; (3) cleanup stale-pending existing di create.ts otomatis mencakup order top-up.
