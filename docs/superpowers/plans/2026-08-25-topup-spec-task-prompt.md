# PROMPT TUGAS BERIKUTNYA — Agent Penulis Spec: Fitur Top-up Novaplan

> Salin seluruh isi file ini (mulai dari baris di bawah) sebagai prompt untuk agent berikutnya.

---

Kamu adalah agent yang akan menulis **design spec** untuk fitur baru di Novaplan. Kamu TIDAK mengimplementasi — deliverable-mu HANYA satu file spec yang matang, lalu berhenti untuk direview owner.

## Konteks Proyek

Repo: TanStack Start app bernama **Novaplan** (AI-powered product development planner, Bahasa Indonesia UI). Working directory: `C:\Coding\Web Development\Tanstack-start\novaplan`. Package manager pnpm, DB PostgreSQL 17 lokal via Docker, Drizzle ORM, Midtrans Snap untuk pembayaran, deploy Vercel.

Baru saja selesai dimigrasikan: model pricing **langganan bulanan** (spec: `docs/superpowers/specs/2026-08-25-monthly-pricing-design.md`, plan: `docs/superpowers/plans/2026-08-25-monthly-pricing.md`). Baca KEDUA dokumen itu dulu — mereka sumber kebenaran model billing saat ini dan gaya penulisan spec di repo ini (bandingkan juga dengan spec lain di folder yang sama).

**WAJIB baca juga sebelum menulis:** `AGENTS.md`, semua file di `.opencode/rules/` (no-assumptions, no-hardcode, novaplan-context), lalu verifikasi sendiri kode aktual:

- `src/db/schema.ts` — tabel `subscriptions` (kolom: plan, status, credits, creditsUsed, currentPeriodStart, currentPeriodEnd, cancelledAt, reminderCount) dan `payments`
- `src/lib/billing.ts` — pure core: `resolveSubscriptionState` (state: free_active | legacy_grandfathered | active_paid | paused), `computePurchaseGrant`
- `src/lib/credits.ts` — hot path: `getCreditBalance` (free rollover write-on-read), `consumeCredit` (atomic, predikat periode di WHERE)
- `src/lib/services/payment-service.ts` — `applyPaymentSuccess` (semantik SET: set plan+kredit+periode; `planFromAmount(amount)` THROW untuk nominal tak dikenal)
- `src/routes/api/payments/create.ts` — generate order_id `ORDER-*`, Snap request, custom_field1-3, ALLOWED_ORIGINS
- `src/routes/api/payments/webhook.ts` — signature sha512, validasi nominal, guard idempoten via status payment
- `src/lib/pricing-data.ts` — struktur `novaPlanPlans` / `FEATURE_ROWS` yang drive halaman /pricing
- `src/hooks/use-user-plan.ts` + `src/routes/api/user/plan.ts` — client membaca `subscriptionState`

## Fitur yang Di-spec-kan: TOP-UP Kredit Mid-Period

User pro/hengker yang MASIH aktif dapat membeli paket kredit tambahan **tanpa memperpanjang masa aktif**, dengan harga per-kredit lebih murah dari paket bulanan.

### Keputusan Owner (SUDAH FINAL — jangan dibuka lagi)

1. **SKU tunggal universal**: 15 kredit / Rp 20.000 (±Rp 1.333/kredit; pembanding: Pro bulanan ±Rp 1.633/kredit, Hengker ±Rp 1.419/kredit).
2. **Eligibility**: HANYA user dengan state efektif `active_paid` (plan pro/hengker, periode berjalan). User `paused` harus renew dulu; user free tidak bisa membeli.
3. **Kredit top-up = satu kolam dengan kredit bulanan**: dibakar lebih dulu secara efektif (satu angka `credits`/`creditsUsed`), dan **hangus bersama di akhir periode berjalan** — tidak ada pool kedua, tidak ada perubahan skema untuk ini.
4. **Cap anti-undercut**: total kredit top-up yang berhasil dibeli dalam SATU periode berjalan ≤ alokasi plan (Pro 30, Hengker 105). Sisa kuota top-up reset saat periode berganti.

### Fakta Teknis Terverifikasi (pakai apa adanya; verifikasi ulang bila ragu)

- Webhook saat ini hanya mengenal alur beli paket: `applyPaymentSuccess(orderId)` melakukan SET grant lewat `computePurchaseGrant`. Nominal yang tidak cocok harga paket membuat `planFromAmount` throw → **top-up wajib punya jalur routing terpisah**. Pendekatan yang disarankan (spec-mu yang memfinalkan): order_id prefix `TOPUP-…` dibuat di create.ts; webhook branch by prefix → fungsi grant baru (mis. `applyTopUpSuccess`) yang ADDITIF (`credits = credits + 15`), tidak menyentuh plan/periode/status/cancelledAt/reminderCount. Idempotensi tetap dari guard existing (bail jika payment sudah success).
- **Tanpa migrasi skema**: cap bisa dihitung dari tabel `payments` (jumlah kredit top-up sukses yang `createdAt`-nya jatuh di antara `currentPeriodStart`..`currentPeriodEnd` row langganan aktif). Simpan identitas SKU di kolom `payments.plan` (mis. `topup-15`) agar jumlah kredit bisa didefinisi konstanta, JANGAN parse dari nominal.
- Elastisitas race: validasi eligibility + cap dilakukan dua lapis — di create.ts (pra-checkout, UX) dan di dalam transaksi grant (kebenaran akhir). Tentukan sikap spec terhadap race sempit (mis. dua checkout top-up konkuren melewati cap ≤1 SKU; putuskan: tolerir overshoot 1 SKU ATAU kunci baris langganan `FOR UPDATE` — pilih salah satu secara eksplisit).
- Konstanta SKU wajib hidup di `src/lib/constants.ts` atau modul konfigurasi top-up baru (no-hardcode rule). Harga & jumlah kredit TIDAK boleh tersebar magic number.
- UI: seksi/baris "Top Up" di /pricing yang hanya tampil untuk `subscriptionState === "active_paid"`, plus CTA alternatif di kondisi kredit habis (credit-exhausted modal / banner / halaman billing): "Top Up 15 kredit — Rp 20.000 (tanpa menambah masa aktif)". Copy Bahasa Indonesia; jelaskan dengan jelas bahwa top-up TIDAK memperpanjang masa aktif dan sisa top-up ikut hangus di akhir periode.
- Setelah webhook sukses, refetch plan (`useUserPlan().refetch()`) seperti pola syncPaymentStatus existing.

### Isi Wajib Spec (ikuti format spec lain di repo: Goal & Success Criteria, Global Constraints, Architecture Overview, Data Model, Logika Inti, Flow, UI Changes, Edge Cases, Testing Strategy, Deployment Steps)

Wajib ada bagian eksplisit untuk:

1. **Edge cases**: top-up saat sisa periode < 24 jam; retry/duplicate webhook top-up (idempoten); top-up tepat saat periode berakhir di detik yang sama (state berubah active_paid → paused mid-checkout — tentukan perilaku: grant ditolak/refund manual? pilih dan tulis); user ganti plan saat punya kuota top-up terpakai; legacy grandfathered (period NULL) — tegas TIDAK eligible karena bukan active_paid; cap dihitung dari payments sukses-only.
2. **Testing strategy**: unit test pure selector/helper (eligibility, cap calculation, sku mapping) di lokasi pure (zero import db), regression test `payment-service.test.ts` + `billing.test.ts` tetap hijau, smoke checklist Midtrans sandbox (beli top-up → kredit nambah, periode TIDAK bergeser; dobel webhook → tidak dobel kredit).
3. **Deployment**: catat realita repo — rantai migrasi drizzle rusak pre-existing; skema TIDAK berubah di fitur ini (idealnya), jadi deployment = env/config + deploy aplikasi saja.

### Batasan Non-Negotiable (dari rules repo)

- Server-only modules (`db`, email SDK) dynamic import di handler; API routes boleh top-level `import { db }`.
- `consumeCredit` TIDAK boleh diubah bentuk atomicity-nya; fitur ini idealnya nol sentuhan ke credits.ts (verifikasi: kalau ada sentuhan, jelaskan kenapa wajib).
- No hardcode: harga/jumlah/SKU di constants; copy Indonesia; commit message English conventional; TDD untuk semua logic baru; commit+push tiap task.
- YAGNI: tanpa auto-charge, tanpa proration, tanpa pool kredit kedua, tanpa refund otomatis.

### Deliverable & Stop Gate

1. Tulis spec ke `docs/superpowers/specs/2026-08-25-topup-design.md` (sesuaikan tanggal hari eksekusi).
2. Self-review inline: tanpa TBD/placeholder, konsisten internal, tanpa ambiguitas, scope satu implementation-plan.
3. Commit + push file spec (English conventional message, mis. `docs: add mid-period credit top-up design spec`).
4. **BERHENTI.** Laporkan path spec ke owner dan minta review. JANGAN lanjut ke implementation plan — itu tugas berikutnya setelah owner approve.

Kalau ada pertentangan antara fakta kode aktual dan dokumen konteks di atas, kode aktual yang menang — catat temuanmu di bagian "Open Questions" spec untuk diputuskan owner.
