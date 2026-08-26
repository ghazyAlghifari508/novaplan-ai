# Pricing Bulanan (Subscription) — Design Spec

**Date:** 2026-08-25
**Status:** Draft — awaiting user approval
**Scope:** Migrasi model pricing dari one-time payment ke langganan bulanan: kredit hangus per periode, status paused saat masa aktif habis, cancel/renew manual, reminder email.
**Out of scope:** Auto-charge Midtrans Subscription API (tokenisasi kartu), proration, referral/affiliate, perubahan harga.

**Tech Stack:** TanStack Start + TanStack Router (file-based `src/routes/`), React 19, Drizzle ORM + PostgreSQL 17, Midtrans Snap, Resend (integrasi baru), Vitest + Playwright, Biome, pnpm, deploy di Vercel.

---

## 1. Goal & Success Criteria

**Goal:** Ganti model bisnis dari "beli sekali, kredit selamanya" menjadi **langganan bulanan** tanpa mengubah aturan fitur: free = PRD-only, pro/hengker = full workflow.

**Keputusan produk yang sudah dikonfirmasi owner:**

| Aspek | Keputusan |
|---|---|
| Model bayar | Bulanan, **manual renewal** via Midtrans Snap (tanpa auto-charge) |
| Free tier | Tetap PRD-only, tapi **2 kredit per bulan** (reset tiap periode, sisa hangus) |
| Pro / Hengker | Full workflow, kredit segar per periode, sisa hangus di akhir periode |
| Masa aktif habis | Status **paused** (indefinite): bisa lihat semua data, tidak dapat kredit baru, tidak bisa generate |
| Keluar dari pause | **Cancel** → jadi free tier normal, atau **Renew** → aktif lagi + kredit segar |
| Renew saat masih aktif | Periode **ditambahkan** (+30 hari dari `current_period_end`, tidak tumpang tindih) |
| User lama one-time | **Grandfathered**: sisa kredit lama tetap berlaku sampai habis, tanpa expire |

**Success criteria (measurable):**
- Semua gating kredit benar terhadap waktu: user paused tidak bisa generate meski row DB-nya belum di-mutate (lazy evaluation).
- Webhook renewal idempotent: retry Midtrans tidak pernah menggandakan periode/kredit.
- Tidak ada breaking change untuk user existing: row lama (`current_period_end IS NULL`) berperilaku persis seperti sekarang.
- Email reminder terkirim otomatis via Vercel Cron tanpa infrastruktur baru.

---

## 2. Global Constraints (berlaku untuk semua task)

- **Framework:** TanStack Start file-based routing di `src/routes/`. Bukan Next.js.
- **Server-only modules:** `db`, `pg`, `auth`, dan wrapper email wajib dynamic import di handler / `createServerFn` — jangan di top-level client bundle.
- **Credits:** 1 credit = 1 generate (PRD/AC/Task). Revision = free unlimited. Jangan tambah credit gate di revision flow.
- **No hardcode:** durasi periode, jadwal reminder, secret — semua di `src/lib/constants.ts` atau env var.
- **No fake indicators:** banner "masa aktif habis" harus digerakkan dari state efektif subscription asli (dari `getCreditBalance`), bukan tebakan client-side.
- **Bahasa:** UI copy & email Bahasa Indonesia; istilah teknis tetap English.
- **Atomicity:** `consumeCredit` harus tetap atomic single-statement (predikat di WHERE), tidak boleh read-then-write.
- **Zustand = in-memory:** server truth di Postgres; plan/pause state selalu di-resolve dari DB.

---

## 3. Architecture Overview

Pendekatan: **kolom periode pada `subscriptions` + evaluasi lazy + cron ringan hanya untuk email.**

```
                    ┌──────────────────────────────────────────────┐
                    │ getCreditBalance(userId)  ← hot path         │
                    │  resolve efektif:                            │
                    │   periodEnd NULL        → legacy/grandfathered│
                    │   now <= periodEnd      → active             │
                    │   now >  periodEnd      → paused/free-rollover│
                    └──────────────┬───────────────────────────────┘
                                   │
   Beli/Renew (Snap) ──► webhook ──► applyPaymentSuccess
                                    set plan, credits, period (+30d aditif)
                                   │
   Cancel (settings/billing) ──► server fn: plan→free, reset periode
                                   │
   Vercel Cron (harian) ──► GET /api/cron/billing (Bearer secret)
                            ├── notice H-3 sebelum periode habis
                            └── reminder D+1 / D+7 / D+14 saat paused
                                   │
                            resend wrapper (src/lib/email.ts)
```

Prinsip kunci:

1. **Gating = fungsi murni dari waktu.** Kebenaran akses tidak bergantung pada cron. Cron hanya kirim email (yang memang tidak bisa dilakukan lazily).
2. **NULL period = legacy.** Grandfathering gratis tanpa backfill data: row paid lama dengan `current_period_end IS NULL` mempertahankan perilaku lama (kredit aditif, never expire) secara otomatis.
3. **Free rollover pakai write-on-read** yang idempotent (UPDATE dengan predikat `period_end < now`), bukan cron.

---

## 4. Data Model

### 4.1 Perubahan schema `subscriptions` (`src/db/schema.ts:83`)

Kolom baru (semua nullable → migrasi non-breaking):

| Kolom | Tipe | Arti |
|---|---|---|
| `current_period_start` | timestamp NULL | Awal periode berjalan |
| `current_period_end` | timestamp NULL | Akhir periode. **NULL = legacy/grandfathered (never expire)** |
| `cancelled_at` | timestamp NULL | Rekaman kapan user cancel (audit saja) |
| `reminder_count` | integer NOT NULL default 0 | Progres email notifikasi: 0 = belum ada, 1 = notice H-3, 2–4 = paused reminder D+1/D+7/D+14 (lihat §7.2) |

Nilai `status` tetap dua nilai yang sudah ada semantiknya: `active | paused` (default `active`). Cancel TIDAK mengubah `status` menjadi nilai baru — lihat §6.2 (yang merekam `cancelled_at` dan mengubah plan ke free). Nilai `paused` ditulis hanya sebagai penanda eksplisit oleh cron housekeeping (opsional, tidak pernah menentukan gating — gating selalu dari state efektif). Index existing `subscriptions_user_id_created_at_idx` dipertahankan (hot path query tidak berubah bentuk).

### 4.2 Seed signup (`src/lib/auth.ts:29`)

Row free baru dibuat **dengan periode**: `current_period_start = now`, `current_period_end = now + BILLING_PERIOD_DAYS`, `credits = PLAN_CREDITS.free`.

### 4.3 Migrasi

`drizzle-kit generate` + `migrate`. Tidak ada backfill data:
- Row paid lama: biarkan `period_end NULL` = grandfathered by design.
- Row free lama: di-inisialisasi lazily oleh write-on-read rollover (lihat §5.3).

---

## 5. Logika Inti: Effective Subscription State

Semua konsentrasi di `src/lib/credits.ts`. Fungsi baru `resolveSubscriptionState(sub, now)` — pure function agar mudah di-unit-test:

### 5.1 Matriks state efektif

| Kondisi row | State efektif | Akses |
|---|---|---|
| `plan = 'free'`, periode aktif | `free_active` | PRD-only, sisa kredit = credits − creditsUsed |
| `plan ≠ 'free'`, `period_end NULL` | `legacy_grandfathered` | Perilaku lama persis: fitur sesuai plan, kredit aditif never-expire |
| `plan ≠ 'free'`, `now <= period_end` | `active_paid` | Full fitur sesuai plan |
| `plan ≠ 'free'`, `now > period_end` | `paused` | Read-only semua data; generate diblokir penuh (sisa kredit hangus); UI tawarkan renew/cancel |

`resolveSubscriptionState` mengembalikan juga `effectiveRemaining`: untuk state `paused` nilainya dipaksa **0** (bukan `credits - creditsUsed`), sehingga `checkCredits` otomatis menolak tanpa jalur khusus.

Catatan: `status` kolom di DB boleh tertinggal (`active` padahal sudah lewat) — yang menentukan akses adalah **state efektif**, bukan nilai kolom mentah. Kolom status tetap ditulis saat ada transisi eksplisit (cancel, apply payment).

### 5.2 Perubahan `getCreditBalance` & `consumeCredit`

- `getCreditBalance`: panggil `resolveSubscriptionState`; return tambahan field `subscriptionState` (untuk UI banner) dan `currentPeriodEnd`.
- `consumeCredit`: predikat WHERE ditambah syarat periode, tetap satu statement atomik:
  ```sql
  UPDATE subscriptions SET creditsUsed = creditsUsed + 1
  WHERE id = :id
    AND creditsUsed < credits
    AND (current_period_end IS NULL OR current_period_end >= now())
  ```
  Efeknya: user paused **tidak bisa membakar** sisa kredit yang seharusnya hangus, bahkan jika request menyusup di milidetik sebelum mutasi apa pun. Row free/legacy dengan periode NULL tetap berperilaku seperti sekarang.

### 5.3 Free monthly rollover (write-on-read)

Di `getCreditBalance`, sebelum resolve state: jika `plan = 'free'` DAN (`period_end IS NULL` ATAU `now > period_end`) → satu UPDATE idempotent:

```sql
UPDATE subscriptions SET
  current_period_start = :now,
  current_period_end   = :now + BILLING_PERIOD_DAYS,
  credits              = PLAN_CREDITS.free,
  creditsUsed          = 0,
  updated_at           = :now
WHERE id = :id AND (current_period_end IS NULL OR current_period_end < :now)
```

Predikat WHERE membuat dua request konkuren hanya me-rollover sekali. Free user yang absen 3 bulan tetap hanya dapat 1x alokasi saat kembali (tidak akumulasi) — konsisten dengan prinsip "hangus".

---

## 6. Flow Pembayaran & Transisi

### 6.1 Purchase / Renew (`applyPaymentSuccess`, `src/lib/services/payment-service.ts`)

Perilaku baru menggantikan logika aditif:

1. Anchor = `max(now, current_period_end)` **jika** periode masih aktif; jika paused/expired/row baru → anchor = `now`.
2. Set: `plan` = plan belian, `current_period_start = now`, `current_period_end = anchor + BILLING_PERIOD_DAYS`, `credits = PLAN_CREDITS[plan]` (**SET, bukan tambah**), `creditsUsed = 0`, `status = 'active'`, `cancelled_at = NULL`.
3. Idempotency tetap dijaga oleh guard existing (bail jika payment sudah `success`) — retry webhook tidak menggandakan periode.

**Tradeoff yang disengaja (dokumentasikan di kode):** early renewal me-reset kredit saat bayar, bukan saat periode lama berakhir — hari tersisa tidak menghasilkan kredit ganda. Sederhana dan deterministik.

**Ganti plan saat aktif (pro ↔ hengker):** lewat flow beli yang sama; aturan deterministik: SET alokasi plan baru + extend periode dari `period_end` (aturan sama dengan renew). Tidak ada proration.

**Legacy grandfathered yang beli lagi:** masuk model bulanan; sisa kredit legacy **diganti** alokasi baru (bukan dijumlah). Dokumentasikan sebagai transisi one-way.

### 6.2 Cancel (`/settings/billing` → server fn baru `cancelSubscription`)

1. `requireUserServer`, ambil row sub terakhir milik user.
2. Set: `plan = 'free'`, `status = 'active'`, `cancelled_at = now`, lalu jalankan semacam init free (periode now..+30d, `credits = 2`, `creditsUsed = 0`).
3. Riwayat pembayaran tetap terlihat di tabel `payments` (tidak dihapus).
4. UI: tombol cancel dengan dialog konfirmasi (destructive action), copy menjelaskan konsekuensi: kembali ke free, sisa kredit pro/hengker hilang.

### 6.3 Renewal entry point

User paused melihat banner/CTA di app (dan halaman billing): "Perpanjang" → arahkan ke `/pricing` atau langsung trigger `POST /api/payments/create` dengan plan yang sama. Tidak ada endpoint pembayaran baru — reuse flow Snap existing.

---

## 7. Reminder Email (fitur baru)

### 7.1 Wrapper Resend (`src/lib/email.ts` — modul baru)

Belum ada integrasi email di repo (terverifikasi). Wrapper minimal:

- Dynamic import SDK di dalam fungsi (server-only).
- Env: `RESEND_API_KEY`, `EMAIL_FROM` (mis. `PrdFy <billing@prdfy.id>`).
- API: `sendEmail({ to, subject, html })` + template builder untuk 2 jenis email (copy Bahasa Indonesia):
  - **Pre-expiry (H-3):** "Masa aktif {plan} kamu berakhir {tanggal}. Perpanjang untuk keep full workflow."
  - **Paused reminder:** "Akun {plan} kamu sedang pause sejak {tanggal}. Perpanjang atau cancel."
- Kirim gagal = log error, JANGAN pernah menggagalkan cron response (email adalah best-effort).

### 7.2 Endpoint cron (`src/routes/api/cron/billing.ts` — baru)

- `GET /api/cron/billing`, auth: header `Authorization: Bearer ${CRON_BILLING_SECRET}` (bandingkan timing-safe). Vercel Cron otomatis mengirim header ini bila env `CRON_SECRET`... gunakan nama env eksplisit `CRON_BILLING_SECRET` + konfigurasi `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/billing", "schedule": "0 3 * * *" }] }
  ```
- Job (idempotent, aman dipanggil dobel). Satu counter `reminder_count` mengatur seluruh siklus notifikasi, sehingga tidak ada email dobel walau cron terlewat/terpanggil ulang:
  1. **Pre-expiry notice (H-3):** subs paid aktif dengan `period_end - now <= PRE_EXPIRY_NOTICE_DAYS` dan `reminder_count = 0` → kirim email, set `reminder_count = 1`.
  2. **Paused reminder:** subs paid dengan `now > period_end`, `daysSinceExpire = floor((now - period_end) / 1 hari)`; bila `daysSinceExpire >= REMINDER_SCHEDULE_DAYS[reminder_count - 1]` dan `reminder_count - 1 < REMINDER_SCHEDULE_DAYS.length` → kirim email ke-N, increment `reminder_count`. Contoh: count=1 → kirim saat D+1 (jadwal index 0), count=2 → D+7, count=3 → D+14, lalu berhenti (max 4 email per siklus termasuk notice).
  3. Setiap sub diproses independen; kegagalan satu email tidak menghentikan batch.
  4. Seleksi logic diekstrak jadi pure function (`selectBillingEmailTargets(rows, now)`) untuk unit test.
- Response selalu `{ ok: true, sent: n }` kecuali auth gagal (401) — supaya Vercel tidak spam-retry karena error email.

### 7.3 Constants (`src/lib/constants.ts`)

```ts
export const BILLING_PERIOD_DAYS = 30;
export const PRE_EXPIRY_NOTICE_DAYS = 3;
export const REMINDER_SCHEDULE_DAYS = [1, 7, 14] as const;
```

Env baru (dokumentasikan di `.env.example`): `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_BILLING_SECRET`.

---

## 8. UI Changes

| Lokasi | Perubahan |
|---|---|
| `/pricing` + `src/lib/pricing-data.ts` | Copy jadi per-bulan: "Rp 49.000/bulan", deskripsi free "2 kredit PRD per bulan", badge "kredit reset tiap periode". Button label: "Berlangganan Pro/Hengker" |
| `/settings/billing` | Tampilkan: state langganan (aktif s.d. tanggal X / **pause sejak Y** / free), tombol **Cancel** (konfirmasi) dan **Perpanjang**, riwayat payments existing tetap |
| Banner global (layout) | Saat `subscriptionState = 'paused'`: banner persisten "Masa aktif habis — perpanjang atau batalkan langganan", CTA ke billing/pricing |
| Paywall/generate-blocked | Saat paused: pesan spesifik ("Masa aktif habis, kredit bulanan hangus") + CTA renew — beda pesan dari creditsExhausted biasa |
| Landing/auth | Tidak berubah |

Sumber kebenaran UI: loader/server fn yang memanggil `getCreditBalance` (field `subscriptionState` baru) — bukan inferensi client-side dari sisa kredit.

---

## 9. Edge Cases

| Kasus | Perilaku |
|---|---|
| Webhook retry setelah success | Guard existing bail → tidak dobel periode/kredit |
| Dua generate konkuren di detik terakhir periode | Predikat periode di WHERE `consumeCredit` menjamin max 1 burn valid |
| Paused user coba generate via API langsung | `checkCredits` resolve paused → remaining 0 → ditolak |
| Legacy paid user (period NULL) generate | Persis perilaku hari ini (grandfathered), termasuk saat kreditnya habis (full feature, 0 burn) |
| Legacy paid beli lagi | Masuk model bulanan, sisa legacy diganti (§6.1) |
| Free user absen 3 bulan | Rollover sekali saat kembali, tidak akumulasi (§5.3) |
| Early renewal (masih aktif) | Extend dari `period_end`, kredit reset saat bayar (tradeoff terdokumentasi) |
| Cancel lalu beli lagi | Normal: applyPaymentSuccess set ulang semuanya, `cancelled_at` di-clear |
| Cron gagal jalan beberapa hari | Tidak ada dampak gating; hanya email telat. Reminder count mencegah spam backlog |
| Timezone | Semua boundary UTC di server; format tanggal untuk UI/email pakai locale id-ID |

---

## 10. Testing Strategy

**Unit (Vitest):**
- `resolveSubscriptionState` — matriks lengkap §5.1 (termasuk boundary `now == period_end`).
- Rollover free: idempotent, tidak akumulasi, init row legacy-free.
- `consumeCredit`: blokir burn saat paused (predikat periode), tetap lolos legacy NULL.
- `applyPaymentSuccess`: new sub / renew saat aktif (extend dari period_end) / renew saat paused / switch plan / retry idempotent.
- `cancelSubscription`: set free + reset periode + record cancelled_at.
- `selectBillingEmailTargets`: H-3, D+1/D+7/D+14, anti-dobel.
- `pricing-data`: copy mengandung "/bulan" & angka kredit sesuai PLAN_CREDITS.

**E2E (Playwright, ringan):** banner paused tampil untuk fixture sub expired; tombol cancel mem-free-kan akun (mock/admin-seeded DB). Payment e2e nyata tetap manual QA via Midtrans sandbox (checklist di plan implementasi).

**Regression wajib:** test existing `payment-service.test.ts` dan `types/database.test.ts` tetap hijau — grandfathering tidak boleh mengubah perilaku row lama.

---

## 11. Deployment Steps (urutan aman)

1. Merge schema (kolom nullable) → `drizzle-kit generate` + `migrate` (non-breaking, backward compatible).
2. Deploy aplikasi baru (kode lama & baru koeksisten aman: kolom baru diabaikan kode lama).
3. Set env produksi: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_BILLING_SECRET`; tambah `vercel.json` crons.
4. Verifikasi manual: beli sandbox → renew → tunggu/geser periode (fixture) → paused → cancel.
5. Komunikasi ke user existing (di luar scope teknis): sisa kredit lama tetap berlaku.

Rollback: revert deploy aman (kolom nullable diabaikan); tidak perlu rollback DB.
