# PRD-01: Homepage & Setup Page — Dual-Mode Entry Flow

## ⚠️ STATUS: SUDAH ADA DI CODEBASE — SKIP IMPLEMENTASI
Setelah baca kode aktual (`src/app/setup/setup-client.tsx`, `src/components/layout/chat-input.tsx`), flow ini **sudah jalan dan sesuai TODO.md**:
- Home → ketik prompt → `handleSend` → cek auth → `router.push("/setup")`
- Setup page **sudah punya 2 kartu**: "Biarkan AI Memilih" (Sparkles) + "Pilih Sendiri" (PenTool)
- Kartu AI → `savePendingPrdPrompt("auto")` → `/prd`
- Kartu Manual → `/setup/manual`
- Home input punya platform toggle (Mobile/Web) + model selector — **DIPERTAHANKAN** (keputusan user)

**Keputusan (dikonfirmasi user):** PRD-01 di-SKIP. Setup flow tidak diubah. Mulai implementasi dari PRD lain sesuai prioritas.

Catatan: PRD di bawah adalah draft awal yang ternyata mengarang "redesign" padahal fitur sudah ada. Disimpan sebagai arsip, JANGAN diimplementasi.

---

## Problem
Current entry flow: landing → prompt → `/setup` (mode selection: AI Auto / Fill Form) → PRD. Yang bener: landing → prompt → `/setup` (2 pilihan: "Biarkan AI memilih" / "Isi Manual"). Setup adalah decision point penting — bukan diskip. User perlu kontrol apakah AI yg tentuin jalan atau user yg detailin manual.

## Scope
**In:** Redesign landing page + setup page. Landing: prompt input + CTA "Buat PRD". Redirect ke `/setup` dengan 2 opsi: "Biarkan AI memilih" (recommended) dan "Isi Manual". Setup jadi decision page, loading state pas AI generate.

**Out:** Form input manual detail (tetap ada via "Isi Manual" → `/setup/manual`), multi-template.

---

## User Flows

### Normal Flow A — "Biarkan AI Memilih"
1. User landing di `/` (bisa unauthenticated)
2. Lihat hero section + prompt input + tombol "Buat PRD"
3. Ketik ide produk (min 20 chars) → klik "Buat PRD"
4. Kalo blom login → redirect ke `/login?redirect=/setup` (simpan prompt ke sessionStorage)
5. Kalo udah login → prompt disimpan ke sessionStorage → redirect ke `/setup`
6. Di `/setup`, 2 opsi ditampilkan: "Biarkan AI Memilih" (primary) dan "Isi Manual" (secondary)
7. User klik "Biarkan AI Memilih"
8. Loading state: spinner + "AI sedang menyusun PRD..."
9. POST `/api/chat` dengan mode "generate"
10. Redirect ke `/prd/[id]` pas project created
11. PRD auto-stream (existing SSE)

### Normal Flow B — "Isi Manual"
1-5. Sama sampe `/setup`
6. User klik "Isi Manual"
7. Redirect ke `/setup/manual` (existing form)
8. User isi detail → submit → generate PRD

### Negative Flow A: Prompt < 20 karakter
1. User klik "Buat PRD" dengan input pendek
2. Inline error: "Minimal 20 karakter"
3. Border merah, error auto-clear pas udah cukup

### Negative Flow B: API Error
1. Setup page, klik "Biarkan AI Memilih" → API gagal
2. Toast: "Gagal memulai. Coba lagi."
3. Button re-enable, input preserved

### Negative Flow C: Quota Exceeded
1. API 403 → LimitModal: "Kamu udah mencapai batas PRD"
2. Link ke `/pricing`

---

## UI States

### Landing Page — Prompt Input
- Hero with animated background (existing)
- Textarea untuk prompt
- Tombol "Buat PRD" (primary, full width on mobile)
- Karakter counter: "0/20 minimum"
- Tombol disabled sampe ≥20 chars

### Setup Page — Mode Selection
- Dua kartu opsi:
  ```
  ┌──────────────────────────────────┐
  │  Pilih cara bikin PRD-mu         │
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │ 🤖 Biarkan AI Memilih     │  │ ← primary, recommended badge
  │  │ AI akan generate PRD       │  │
  │  │ berdasarkan ide kamu       │  │
  │  └────────────────────────────┘  │
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │ ✍️ Isi Manual              │  │ ← secondary
  │  │ Input detail produk sendiri│  │
  │  └────────────────────────────┘  │
  └──────────────────────────────────┘
  ```
- Mobile: kartu full-width, stack vertikal

### Setup Page — Loading (after "Biarkan AI Memilih")
- Button spinner: "AI sedang menyusun PRD..."
- Animasi: skeleton PRD preview
- Cancel button (AbortController)

### Setup Page — Error
- Toast notification
- Button re-enable
- User bisa pilih ulang

---

## Component Changes

### Landing Page (src/app/page.tsx)
- Hero + ChatInput tetap ada
- CTA: "Buat PRD" (instead of "Biarkan AI memilih")
- On submit: save prompt ke sessionStorage → redirect ke `/setup`

### Setup Page (src/app/setup/page.tsx) — REDESIGN
- Hapus existing mode selection (AI Auto / Fill Form)
- Ganti dengan 2 kartu: "Biarkan AI Memilih" + "Isi Manual"
- "Biarkan AI Memilih" → langsung call API + redirect ke PRD
- "Isi Manual" → redirect ke `/setup/manual`

### ChatInput (src/components/layout/chat-input.tsx)
- Change CTA text dari "Biarkan AI memilih" ke "Buat PRD"
- On submit → sessionStorage + redirect ke `/setup`
- Minimum char validation: 20

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/app/page.tsx` | Modify | Update CTA, redirect ke /setup |
| `src/components/layout/chat-input.tsx` | Modify | "Buat PRD" button instead of "Biarkan AI memilih" |
| `src/components/layout/hero.tsx` | Modify (minor) | Adjust CTA refs |
| `src/app/setup/page.tsx` | **REDESIGN** | 2 kartu opsi (AI/Manual) |
| `src/app/setup/setup-client.tsx` | **REWRITE** | New mode selection UI + loading state |
| `src/lib/prompt-handoff.ts` | Modify | Keep existing (prompt masih disimpan) |
| `src/app/setup/manual/page.tsx` | Keep | Manual mode tetap ada |

---

## Edge Cases
- [ ] User paste prompt >5000 chars → textarea handle normal, API accept sampai current max
- [ ] Back button dari `/setup` ke `/` → prompt masih di sessionStorage, bisa lanjut
- [ ] User refresh di `/setup` → prompt masih ada (sessionStorage)
- [ ] User langsung visit `/setup` tanpa prompt → redirect ke `/` + toast "Masukkan ide produk dulu"
- [x] Non-Latin input → UTF-8 fine, 20 char validation tetap

## Security
- Same as existing: middleware protect `/prd/*`, `/setup` redirect kalo blom auth
- Rate limit di `/api/chat` (existing)

## Dependencies
- None standalone
- Blocking for: PRD-02, PRD-03

## Effort
- Files modified: 4
- Files redesigned: 2
- New files: 0
- Complexity: Low
