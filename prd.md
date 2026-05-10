# PRD — AI PRD Generator
**"NovaPlan"** · Product Requirements Document  
Versi: 1.0.0 · Tanggal: 10 Mei 2026 · Status: Draft

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Requirements](#3-requirements)
4. [Core Features](#4-core-features)
5. [User Flow](#5-user-flow)
6. [Architecture](#6-architecture)
7. [Database Schema](#7-database-schema)
8. [Design & Technical Constraints](#8-design--technical-constraints)
9. [Pricing & Subscription](#9-pricing--subscription)
10. [Fase Pengerjaan](#10-fase-pengerjaan)
11. [Use Case Diagram](#11-use-case-diagram)
12. [Sequence Diagram](#12-sequence-diagram)
13. [Skenario Diagram](#13-skenario-diagram)
14. [Rekomendasi Tambahan](#14-rekomendasi-tambahan)
15. [Risiko & Mitigasi](#15-risiko--mitigasi)
16. [Glossary](#16-glossary)

---

## 1. Overview

### 1.1 Nama Produk
**NovaPlan** — Platform berbasis web untuk men-generate Product Requirements Document (PRD) secara otomatis menggunakan kecerdasan buatan (AI).

### 1.2 Deskripsi Produk
NovaPlan adalah aplikasi web yang memungkinkan product manager, developer, founder, dan tim teknologi untuk menghasilkan dokumen PRD yang lengkap, terstruktur, dan siap pakai hanya melalui percakapan natural dengan AI. Output PRD dihasilkan dalam format `.md` (Markdown) yang dapat langsung digunakan sebagai referensi pengembangan produk.

### 1.3 Latar Belakang
Pembuatan PRD secara manual adalah proses yang memakan waktu, membutuhkan keahlian khusus, dan sering kali tidak konsisten antar tim. NovaPlan hadir untuk:
- Mempercepat proses dokumentasi produk dari berhari-hari menjadi menit.
- Memastikan standarisasi format PRD di seluruh tim.
- Membantu tim kecil atau non-teknis yang tidak familiar dengan struktur PRD.
- Menyediakan starting point yang solid yang bisa di-iterate bersama AI.

### 1.4 Target Pengguna
- **Product Manager** — membutuhkan dokumen yang cepat dan terstruktur.
- **Startup Founder / CTO** — perlu mendokumentasikan ide produk dengan cepat.
- **Software Developer** — perlu blueprint sebelum mulai coding.
- **UX/UI Designer** — membutuhkan referensi requirement saat mendesain.
- **Mahasiswa / Fresh Graduate** — belajar membuat PRD standar industri.

### 1.5 Nilai Proposisi
> *"Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari."*
> — **NovaPlan**

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
- Mencapai 1.000 pengguna terdaftar dalam 3 bulan pertama.
- Konversi 10% pengguna gratis ke plan berbayar dalam 6 bulan.
- ARR (Annual Recurring Revenue) Rp 500 juta dalam tahun pertama.

### 2.2 Product Goals
- Waktu generasi PRD pertama < 3 menit setelah user selesai input.
- User satisfaction score (CSAT) ≥ 4.2/5.0.
- 80% user berhasil mendownload PRD yang memuaskan tanpa membutuhkan revisi besar.

### 2.3 Key Metrics (KPI)
| Metrik | Target |
|---|---|
| Daily Active Users (DAU) | 200 dalam 3 bulan |
| PRD Generated / Day | 100+ |
| Avg. Session Duration | > 8 menit |
| Churn Rate (Pro) | < 5% per bulan |
| PRD Download Rate | > 70% dari PRD yang dibuat |

---

## 3. Requirements

### 3.1 Functional Requirements

#### Auth & User Management
- `FR-01` User dapat mendaftar menggunakan email + password.
- `FR-02` User dapat mendaftar / login menggunakan Google OAuth 2.0.
- `FR-03` User yang belum login akan diredirect ke halaman login saat mencoba chat.
- `FR-04` Sistem mendukung manajemen sesi dengan JWT + refresh token.
- `FR-05` User dapat melihat dan mengedit profil mereka.
- `FR-06` User dapat mengganti password dan email.

#### Chat & AI Interaction
- `FR-07` User dapat mengirim pesan chat di halaman Home tanpa login (tapi akan diredirect ke login sebelum AI merespons).
- `FR-08` AI akan mengkonfirmasi pemahaman dan menanyakan preferensi sebelum generate PRD.
- `FR-09` Tersedia dua mode: **"Biarkan AI Memilih"** dan **"Pilih Sendiri"**.
- `FR-10` Mode "Pilih Sendiri" menampilkan form preferensi dengan field: fitur utama, referensi design, target platform, tech stack preference, timeline, skala tim, dan catatan tambahan.
- `FR-11` AI menghasilkan PRD lengkap berformat `.md` setelah input dikonfirmasi.
- `FR-12` User dapat melakukan revisi PRD melalui chat di panel kanan.
- `FR-13` AI memahami konteks PRD yang sedang aktif saat user melakukan revisi.

#### PRD Management
- `FR-14` User dapat melihat daftar semua PRD yang pernah dibuat (dashboard).
- `FR-15` User dapat mendownload PRD dalam format `.md`.
- `FR-16` User dapat mendownload PRD dalam format `.pdf` (plan Pro ke atas).
- `FR-17` User dapat menduplikasi PRD yang sudah ada.
- `FR-18` User dapat menghapus PRD.
- `FR-19` User dapat memberi nama / rename PRD.
- `FR-20` PRD mendukung preview langsung di browser dengan rendering Markdown.

#### Pricing & Subscription
- `FR-21` Terdapat 3 tier: **Gratis**, **Pro** (Rp 25.000/bulan), **Hengker** (Rp 100.000/bulan).
- `FR-22` Setiap tier memiliki batasan jumlah PRD per bulan.
- `FR-23` User dapat upgrade/downgrade plan kapan saja.
- `FR-24` Sistem terintegrasi dengan payment gateway Midtrans (Sandbox untuk development, Production untuk live).
- `FR-25` User mendapatkan notifikasi saat mendekati batas quota.

### 3.2 Non-Functional Requirements

- `NFR-01` **Performance** — Halaman utama load < 2 detik (LCP). Generasi PRD < 60 detik.
- `NFR-02` **Availability** — Uptime 99.5% per bulan.
- `NFR-03` **Security** — Password di-hash oleh Supabase Auth (bcrypt). Data sensitif dienkripsi. HTTPS wajib. OpenRouter API key hanya ada di server-side (environment variable), tidak pernah expose ke client.
- `NFR-04` **Scalability** — Arsitektur mendukung horizontal scaling untuk menangani lonjakan traffic.
- `NFR-05` **Accessibility** — Memenuhi standar WCAG 2.1 Level AA.
- `NFR-06` **Responsiveness** — Tampil optimal di desktop (1280px+), tablet (768px), dan mobile (375px).
- `NFR-07` **Data Privacy** — Konten chat user tidak digunakan untuk melatih model AI tanpa izin eksplisit.

---

## 4. Core Features

### 4.1 🏠 Hero Page dengan Chat Interface
Halaman utama menampilkan video background cinematic dengan search/chat box di tengah. Terinspirasi dari referensi design yang diberikan dengan komponen:
- Video background looping dengan custom JavaScript fade system (250ms rAF).
- Navigation bar transparan dengan blur backdrop.
- Badge "New" dengan tagline produk.
- Headline bold dengan font Fustat.
- Search/Chat input box dengan credit counter, AI branding, dan action buttons.
- Redirect otomatis ke login saat user mencoba chat tanpa sesi aktif.

### 4.2 🔐 Auth System
- Form login / register dengan validasi real-time.
- Google OAuth 2.0 sebagai SSO.
- "Remember me" session.
- Forgot password via email OTP.
- Onboarding singkat setelah registrasi pertama (nama, peran, tujuan penggunaan).

### 4.3 🤖 AI Conversation Engine
Pipeline percakapan AI yang cerdas:

**Step 1 — Intent Detection**
AI mendeteksi bahwa user ingin membuat PRD dan mengkonfirmasi nama/jenis produk.

**Step 2 — Preference Elicitation**
AI menampilkan dua opsi:
```
┌─────────────────────────────────────────────┐
│  Bagaimana kita melanjutkan?                │
│                                             │
│  [🤖 Biarkan AI Memilih]  [✏️ Pilih Sendiri] │
└─────────────────────────────────────────────┘
```

**Step 3a — AI Auto Mode**
AI langsung memilih stack, fitur, dan design approach yang relevan berdasarkan konteks, lalu generate PRD.

**Step 3b — Manual Mode Form**
Form dengan field:
- Nama Aplikasi (text)
- Deskripsi singkat (textarea)
- Target platform (Web / Mobile / Desktop / All)
- Fitur utama yang diinginkan (multi-tag input)
- Referensi design / competitor (text + URL)
- Tech stack preference (dropdown multi-select)
- Skala tim (Solo / 2-5 orang / 5-20 orang / Enterprise)
- Target timeline (dropdown: 1 bulan / 3 bulan / 6 bulan / 1 tahun+)
- Bahasa PRD (Indonesia / English)
- Catatan tambahan (textarea)

**Step 4 — Generation**
Loading state dengan animasi progress bar dan pesan status:
- "Menganalisis kebutuhan produk..."
- "Merancang arsitektur sistem..."
- "Menyusun fase pengerjaan..."
- "Memfinalisasi dokumen PRD..."

**Step 5 — Result + Live Edit**
PRD ditampilkan di panel utama dengan chat panel di sebelah kanan untuk revisi.

### 4.4 📄 PRD Viewer & Editor
- Split-view layout: PRD preview (kiri, ~70%) + Chat panel (kiri/kanan, ~30%).
- Markdown rendering dengan syntax highlighting.
- Table of contents yang clickable dan sticky.
- Tombol download (`.md` / `.pdf`).
- Tombol "Copy to clipboard".
- Version history: melihat perubahan PRD dari waktu ke waktu.
- Share link (read-only public URL) untuk plan Pro ke atas.

### 4.5 📊 Dashboard
- Grid/list view semua PRD yang pernah dibuat.
- Filter berdasarkan: tanggal, nama, status.
- Search PRD berdasarkan keyword.
- Statistik singkat: total PRD dibuat, quota tersisa bulan ini.
- Badge status PRD (Draft / Selesai / Direvisi).

### 4.6 💳 Pricing & Subscription
Halaman pricing interaktif dengan toggle billing (bulanan / tahunan dengan diskon 20%).

| Fitur | Gratis | Pro | Hengker |
|---|---|---|---|
| PRD per bulan | 3 | 25 | Unlimited |
| Download `.md` | ✅ | ✅ | ✅ |
| Download `.pdf` | ❌ | ✅ | ✅ |
| Share link | ❌ | ✅ | ✅ |
| Version history | ❌ | ✅ (30 hari) | ✅ (Unlimited) |
| Revisi per PRD | 3x | 20x | Unlimited |
| Priority AI queue | ❌ | ❌ | ✅ |
| Custom template | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| Support | Community | Email | Dedicated |

### 4.7 ⚙️ Settings & Profile
- Edit profil (nama, foto, role).
- Manajemen subscription (upgrade, downgrade, cancel).
- Riwayat pembayaran.
- Notifikasi preferences.
- Danger zone (hapus akun).

---

## 5. User Flow

### 5.1 Flow Utama — First-time User

```
[Landing Page]
      │
      ▼
[User mengetik request PRD di chat box]
      │
      ▼
[Belum login? → Redirect ke /login]
      │
[Sudah login? → Lanjut]
      │
      ▼
[AI konfirmasi jenis produk]
      │
      ▼
[Tampilkan opsi: "Biarkan AI" vs "Pilih Sendiri"]
      │
      ├─── [AI Memilih] ──────────────────────────┐
      │                                            │
      └─── [Pilih Sendiri] → [Isi Form] ──────────┤
                                                   │
                                                   ▼
                                        [Loading: AI Generate PRD]
                                                   │
                                                   ▼
                                        [PRD Viewer + Chat Panel]
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                               [Download PRD]            [Revisi via Chat]
                                    │                             │
                                    ▼                             ▼
                               [Selesai]                 [AI Update PRD]
```

### 5.2 Flow — Returning User (Revisi PRD)

```
[Login] → [Dashboard] → [Pilih PRD] → [PRD Viewer]
      │
      ▼
[Chat: "Tambahkan narasi di bagian Overview..."]
      │
      ▼
[AI Update Section Spesifik]
      │
      ▼
[PRD Terupdate + Version History Tersimpan]
```

### 5.3 Flow — Upgrade Plan

```
[User mencapai batas quota]
      │
      ▼
[Notifikasi banner + CTA "Upgrade"]
      │
      ▼
[Halaman Pricing]
      │
      ▼
[Pilih Plan → Payment Gateway]
      │
      ▼
[Konfirmasi Pembayaran → Quota Diupdate]
```

---

## 6. Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│         Next.js 15 (App Router) + TypeScript 5.x            │
│     TailwindCSS v4 + 21st.dev UI + Framer Motion v11        │
│     TanStack Query v5 + Zustand v5                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / SSE (ReadableStream)
┌───────────────────────────▼─────────────────────────────────┐
│                    NEXT.JS SERVER LAYER                      │
│     App Router + Server Components + Server Actions          │
│     Route Handlers (API) + Middleware (Auth Guard)           │
│     In-process rate limit: lru-cache + DB rate_limits tabel  │
└──────┬────────────┬──────────────┬──────────────────────────┘
       │            │              │
┌──────▼────┐ ┌─────▼──────────┐ ┌▼────────────────┐
│  Supabase │ │  OpenRouter API│ │ Midtrans Sandbox│
│ (Postgres │ │  (Free/Cheap   │ │ (SNAP API untuk │
│  + Auth   │ │   AI Models)   │ │  Testing)        │
│  + RLS    │ │  gemini-flash  │ └─────────────────┘
│  + Storage│ │  llama-3.1     │
│  + @ssr   │ │  mistral dll)  │
└──────┬────┘ └────────────────┘
       │
┌──────▼────────────────────┐
│   Supabase Storage         │
│   PRD .md files (private)  │
│   Avatar images            │
└────────────────────────────┘
```

### 6.2 Tech Stack

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| Frontend | Next.js | **v15.1.11** (stable) | App Router, Server Components, Server Actions, built-in SSE support |
| Language | TypeScript | **5.x** | Type safety, DX lebih baik |
| Styling | TailwindCSS | **v4.x** | Utility-first, performa build lebih cepat dari v3 |
| UI Components | **21st.dev** | Latest | Komponen modern, animated, design-forward — bukan generic shadcn |
| Animation | Framer Motion | **v11.x** | Smooth transition & micro-interaction |
| State Management | Zustand | **v5.x** | Minimal boilerplate, powerful |
| Server State | TanStack Query | **v5.x** | Caching, refetching, streaming |
| Backend | Next.js API Routes / Server Actions | **v15.x** | Full-stack simplicity, co-located logic |
| Database | Supabase (PostgreSQL) | Latest | Managed Postgres + Auth built-in + RLS + Realtime |
| Supabase Client | @supabase/ssr | Latest | SSR-safe client untuk Next.js App Router |
| AI Engine | **OpenRouter API** | Latest | Akses multi-model gratis/murah (Gemini Flash, Llama, Mistral, dll) |
| Auth | Supabase Auth + Google OAuth | Latest | Built-in, secure, SSR-compatible |
| Storage | Supabase Storage | Latest | File storage untuk PRD .md, akses private/public |
| Cache / Rate Limit | **In-memory (Next.js) + DB-based throttle** | — | Tanpa Redis; gunakan `lru-cache` untuk in-process cache + tabel `rate_limits` di DB untuk per-user limit |
| Payment | **Midtrans Sandbox** (SNAP) | — | Testing environment dulu sebelum production |
| Deployment | Vercel | Latest | DX terbaik untuk Next.js 15, edge network global |
| Monitoring | Sentry + Vercel Analytics | Latest | Error tracking + Web Vitals |
| Email | Resend | Latest | Transactional email modern, DX bagus |

> **Catatan OpenRouter**: OpenRouter menyediakan unified API endpoint (`https://openrouter.ai/api/v1`) yang kompatibel dengan format OpenAI. Model gratis yang direkomendasikan untuk PRD generation: `google/gemini-flash-1.5`, `meta-llama/llama-3.1-8b-instruct:free`, atau `mistralai/mistral-7b-instruct:free`. Untuk kualitas lebih tinggi bisa gunakan `google/gemini-pro-1.5` (berbayar tapi sangat murah).

> **Pengganti Redis**: Karena tidak menggunakan Redis, strategi yang dipakai:
> - **Rate limiting**: Tabel `rate_limits` di Supabase dengan TTL-based row expiry (via `pg_cron` atau cleanup otomatis)
> - **Session caching**: Supabase Auth sudah handle session via cookie, tidak perlu Redis
> - **In-memory cache**: `lru-cache` npm package untuk cache ringan di server (response model, config, dll) — reset saat deploy tapi cukup untuk kebutuhan ini

### 6.3 AI Conversation Architecture (via OpenRouter)

```
User Message
     │
     ▼
[Rate Limit Check]
  - Query tabel rate_limits di DB
  - Blokir jika > N req/menit per user
     │
     ▼
[Context Builder]
  - Ambil system prompt (PRD expert persona)
  - Ambil PRD context (jika ada)
  - Ambil conversation history (last 20 turns)
     │
     ▼
[OpenRouter API Request]
  - Endpoint: https://openrouter.ai/api/v1/chat/completions
  - Model: google/gemini-flash-1.5 (default, gratis)
            atau meta-llama/llama-3.1-70b-instruct:free
  - stream: true (Server-Sent Events)
  - Headers: Authorization: Bearer OPENROUTER_API_KEY
             HTTP-Referer: https://novaplan.ai
             X-Title: NovaPlan
     │
     ▼
[Response Stream Parser]
  - Parse SSE chunks dari OpenRouter
  - Ekstrak delta content
  - Deteksi section yang diupdate via marker tag
     │
     ▼
[PRD Merger]
  - Merge update ke PRD existing (section-based)
  - Simpan version baru ke Supabase
     │
     ▼
[Stream ke Client via Next.js Route Handler + ReadableStream]
```

**Contoh Request ke OpenRouter:**
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://novaplan.ai',
    'X-Title': 'NovaPlan',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-flash-1.5',
    stream: true,
    messages: [
      { role: 'system', content: PRD_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]
  })
})
```

---

## 7. Database Schema

### 7.1 Tabel `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  full_name     VARCHAR(255),
  avatar_url    TEXT,
  role          VARCHAR(50) DEFAULT 'user',       -- user | admin
  provider      VARCHAR(50) DEFAULT 'email',      -- email | google
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Tabel `subscriptions`
```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL DEFAULT 'free',  -- free | pro | hengker
  status          VARCHAR(50) NOT NULL DEFAULT 'active', -- active | cancelled | expired | past_due
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  midtrans_subscription_id  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Tabel `quotas`
```sql
CREATE TABLE quotas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan          VARCHAR(50) NOT NULL DEFAULT 'free',
  prd_used      INTEGER DEFAULT 0,
  prd_limit     INTEGER DEFAULT 3,        -- 3 | 25 | -1 (unlimited)
  revision_used INTEGER DEFAULT 0,
  revision_limit INTEGER DEFAULT 3,       -- 3 | 20 | -1
  reset_at      TIMESTAMPTZ,              -- Tanggal reset quota bulanan
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Tabel `projects` (PRD)
```sql
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL DEFAULT 'Untitled PRD',
  description   TEXT,
  status        VARCHAR(50) DEFAULT 'draft',  -- draft | completed | archived
  mode          VARCHAR(50),                  -- ai_auto | manual
  preferences   JSONB,                        -- form input dari user (manual mode)
  share_token   VARCHAR(100) UNIQUE,          -- untuk public share link
  is_shared     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_share_token ON projects(share_token);
```

### 7.5 Tabel `prd_versions`
```sql
CREATE TABLE prd_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  content       TEXT NOT NULL,               -- Konten PRD dalam format Markdown
  storage_path  TEXT,                        -- Path di Supabase Storage
  change_summary TEXT,                       -- Ringkasan perubahan dari AI
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, version)
);

CREATE INDEX idx_prd_versions_project_id ON prd_versions(project_id);
```

### 7.6 Tabel `conversations`
```sql
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.7 Tabel `messages`
```sql
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL,       -- user | assistant | system
  content       TEXT NOT NULL,
  metadata      JSONB,                     -- Token count, model used, etc
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

### 7.8 Tabel `payments`
```sql
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES subscriptions(id),
  amount            INTEGER NOT NULL,         -- dalam Rupiah
  currency          VARCHAR(10) DEFAULT 'IDR',
  status            VARCHAR(50),              -- pending | success | failed | refunded
  payment_method    VARCHAR(100),
  midtrans_order_id TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.9 Tabel `rate_limits` (Pengganti Redis)
```sql
-- Digunakan untuk per-user rate limiting tanpa Redis
-- Dibersihkan otomatis via pg_cron atau cleanup job scheduled
CREATE TABLE rate_limits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  action        VARCHAR(100) NOT NULL,   -- 'ai_generate' | 'ai_revise' | 'api_call'
  request_count INTEGER DEFAULT 1,
  window_start  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, action, window_start)
);

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);
```

> **Logika rate limiting tanpa Redis:**
> ```typescript
> // Cek apakah user melebihi limit dalam window 1 menit
> const { count } = await supabase
>   .from('rate_limits')
>   .select('*', { count: 'exact' })
>   .eq('user_id', userId)
>   .eq('action', 'ai_generate')
>   .gte('window_start', new Date(Date.now() - 60_000).toISOString())
> 
> if (count >= RATE_LIMIT) throw new Error('Too many requests')
> ```

### 7.10 ERD Overview

```
users ──────────┬──── subscriptions
  │              ├──── quotas
  │              ├──── projects ──── prd_versions
  │              │         └──────── conversations ──── messages
  │              ├──── payments
  │              └──── rate_limits
```

---

## 8. Design & Technical Constraints

### 8.1 Design System

**Tipografi:**
- Headline utama: **Fustat Bold**, 80px (hero), 48px (section), 32px (card)
- Body / UI: **Schibsted Grotesk**, 16px regular, 14px small
- Code blocks: **JetBrains Mono**, 14px
- Subtitle: **Inter**, 20px (hero), 16px (content)

**Color Palette:**
```
Primary Black    : #000000
Primary White    : #FFFFFF
Text Gray        : #505050
Light Gray BG    : #F8F8F8
Accent Green     : rgba(90, 225, 76, 0.89)  — CTA upgrade
Dark Badge       : #0E1311
Border Subtle    : rgba(0,0,0,0.08)
Overlay Dark     : rgba(0,0,0,0.24)         — video overlay
```

**Spacing System (8px grid):**
- XS: 4px, SM: 8px, MD: 16px, LG: 24px, XL: 32px, 2XL: 48px, 3XL: 64px, 4XL: 96px, 5XL: 120px

**Border Radius:**
- SM: 6px, MD: 12px, LG: 18px, XL: 24px, Full: 9999px

### 8.2 Hero Section Specs
Mengacu pada referensi design yang diberikan:
- **Video Background**: `https://d8j0ntlcm91z4.cloudfront.net/...` — 115% dimensi, object-fit cover, object-position top center.
- **Fade system**: Custom rAF-based JavaScript, NO CSS transitions, 250ms fade-in/out, fadingOutRef boolean guard, 100ms delay sebelum replay.
- **Navigation**: Logo Schibsted Grotesk SemiBold 24px, tracking -1.44px. Menu items Medium 16px, tracking -0.2px. Padding 120px horizontal, 16px vertical.
- **Hero Content**: Badge → Headline → Subtitle → Search Box, gap 34px antar elemen utama, -50px top margin adjustment.
- **Search Box**: 728px max-width, 200px height, rounded 18px, backdrop blur, rgba(0,0,0,0.24) background.

### 8.3 Layout Constraints
- Max content width: 1280px
- Chat panel di PRD view: min-width 320px, max-width 400px, dapat di-collapse.
- PRD preview: min-width 600px, scrollable.
- Mobile: Stack vertikal, chat panel menjadi drawer dari bawah.

### 8.4 Technical Constraints
- AI response di-stream menggunakan **Next.js Route Handler + ReadableStream** (native, tanpa library tambahan) untuk UX real-time.
- **OpenRouter API Key** disimpan di environment variable server-side saja (`OPENROUTER_API_KEY`). Tidak pernah diekspos ke client.
- **Model fallback strategy**: Jika model utama (gemini-flash-1.5) gagal/overloaded, fallback otomatis ke `meta-llama/llama-3.1-8b-instruct:free`.
- Max PRD size: 50.000 karakter (untuk menghindari context window overflow model gratis).
- Conversation history yang dikirim ke AI: 20 pesan terakhir (memory management hemat token).
- File `.md` disimpan di Supabase Storage dengan akses private (kecuali shared).
- **Rate limiting**: DB-based via tabel `rate_limits` — 5 request AI/menit per user (free), 15/menit (Pro), 30/menit (Hengker). General API: 60 req/menit per user.
- **Tidak menggunakan Redis** — digantikan oleh `lru-cache` untuk in-process caching dan tabel `rate_limits` di Supabase untuk distributed throttling.
- PDF export menggunakan `@react-pdf/renderer` (client-side) atau Puppeteer (server-side via API route) untuk plan Pro ke atas.
- Image upload di form preferensi: max 5MB, format JPG/PNG/WebP saja.
- Semua timestamp disimpan dalam UTC.
- **UI Components**: menggunakan **21st.dev** sebagai komponen library utama. 21st.dev menyediakan komponen animated, modern, dan siap pakai yang di-copy langsung ke project (bukan install sebagai dependency berat). Komponen dikustomisasi dengan TailwindCSS v4.

### 8.5 21st.dev Component Strategy
21st.dev adalah library komponen berbasis copy-paste (mirip shadcn tapi lebih animated dan design-forward). Komponen yang akan digunakan:
- **Chat UI**: Message bubbles, typing indicator, chat input
- **Navigation**: Navbar dengan blur backdrop
- **Cards**: PRD cards di dashboard
- **Forms**: Input fields, select, multi-tag input
- **Modals**: Preference form, confirmation dialog
- **Loaders**: Skeleton loading, progress bar
- **Badges**: Status badge, plan badge
- **Pricing**: Pricing cards dengan toggle
- **Toasts**: Notifikasi sukses/error

### 8.5 Browser Support
- Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Video background fallback: gradient animasi jika browser tidak support autoplay.

### 8.6 Accessibility
- Semua interactive element memiliki `aria-label`.
- Color contrast ratio ≥ 4.5:1 untuk teks body.
- Keyboard navigasi penuh (Tab, Enter, Escape).
- Screen reader support untuk chat messages.

---

## 9. Pricing & Subscription

### 9.1 Tier Detail

| | 🆓 Gratis | ⭐ Pro | 🔥 Hengker |
|---|---|---|---|
| **Harga** | Rp 0 | **Rp 25.000/bln** | **Rp 100.000/bln** |
| PRD/bulan | 3 | 25 | ∞ Unlimited |
| Revisi/PRD | 3x | 20x | ∞ Unlimited |
| Download `.md` | ✅ | ✅ | ✅ |
| Download `.pdf` | ❌ | ✅ | ✅ |
| Share link | ❌ | ✅ | ✅ |
| Version history | ❌ | 30 hari | Unlimited |
| Custom template | ❌ | ❌ | ✅ |
| Priority AI queue | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| Support | Community | Email 48j | Dedicated 4j |

### 9.2 Payment Integration
- **Payment Gateway**: Midtrans **Sandbox** (testing environment)
- **Midtrans Sandbox credentials**: `MIDTRANS_SERVER_KEY_SANDBOX` + `MIDTRANS_CLIENT_KEY_SANDBOX`
- **Endpoint sandbox**: `https://app.sandbox.midtrans.com/snap/snap.js`
- **Metode yang bisa ditest di sandbox**: Virtual Account, GoPay simulator, QRIS simulator, kartu kredit test
- **Kartu kredit test**: `4811 1111 1111 1114` (sukses), `4911 1111 1111 1113` (gagal)
- **Webhook URL**: `/api/payments/webhook` — harus di-expose via `ngrok` saat development lokal
- **Billing cycle**: Bulanan, auto-renewal (implementasi webhook untuk handle notifikasi recurring)
- **Invoice**: Dikirim via Resend setelah webhook sukses diterima
- **Catatan**: Saat siap production, cukup ganti env vars ke production key — kode tidak perlu diubah

> ⚠️ **Jangan lupa**: Midtrans Sandbox tidak memproses uang nyata. Gunakan kredensial test yang tersedia di dashboard sandbox Midtrans untuk simulasi semua skenario pembayaran.

---

## 10. Fase Pengerjaan

### 🔵 Fase 0 — Foundation & Setup (Minggu 1-2)

**Tujuan**: Setup environment, tooling, dan struktur proyek.

**Tasks:**
- [ ] Inisialisasi proyek **Next.js v15.1.11** dengan TypeScript 5.x, ESLint, Prettier
- [ ] Setup **TailwindCSS v4** (konfigurasi berbeda dari v3 — gunakan `@import "tailwindcss"` bukan config file lama)
- [ ] Setup **21st.dev** komponen (copy komponen yang dibutuhkan ke `/components/ui/`)
- [ ] Konfigurasi **Supabase** project (database, auth, storage) + install `@supabase/ssr`
- [ ] Setup repository GitHub dengan branching strategy (main/develop/feature/*)
- [ ] Konfigurasi environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  OPENROUTER_API_KEY=
  MIDTRANS_SERVER_KEY_SANDBOX=
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX=
  RESEND_API_KEY=
  NEXT_PUBLIC_APP_URL=
  ```
- [ ] Setup CI/CD pipeline (GitHub Actions → Vercel)
- [ ] Konfigurasi Sentry untuk error monitoring
- [ ] Desain skema database final dan buat migration scripts (Supabase Migrations)
- [ ] Setup Supabase JS client (`createBrowserClient` + `createServerClient` dari `@supabase/ssr`)
- [ ] Dokumentasi: README, setup guide, env example

**Deliverable**: Proyek boilerplate berjalan di local dan staging, DB ter-migrate, semua env terkonfigurasi.

> ⚠️ **Sebelum lanjut ke Fase 1** — jalankan Agent Skills Setup berikut di root direktori project. Ini bagian dari Fase 0, bukan fase terpisah.

#### Agent Skills Setup (Bagian dari Fase 0)

Install 3 agent skills berikut agar AI coding assistant (Cursor, Windsurf, Claude Code, dll) memahami best practices stack NovaPlan secara otomatis. Skills ini dibaca oleh AI agent setiap kali bekerja di project, sehingga output kode lebih konsisten dan idiomatik.

**Skill 1 — Find Skills**
```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```
Fungsi: Jika membutuhkan skill tambahan yang diperlukan untuk membangun aplikasi ini, gunakan skill tersebut untuk menemukan dan menggunakan skill yang dibutuhkan!

**Skill 2 — Vercel React Best Practices**
```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
```
Fungsi: AI agent akan otomatis mengikuti best practices untuk Next.js 15 App Router, React 19, optimasi performa, dan deployment ke Vercel.

**Skill 3 — Supabase Postgres Best Practices**
```bash
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices
```
Fungsi: AI agent akan otomatis mengikuti best practices untuk `@supabase/ssr`, RLS policy, query optimization, dan Supabase Auth patterns.

- [ ] Jalankan ketiga perintah di atas di root project
- [ ] Verifikasi dengan: `npx skills list`
- [ ] Commit file skills ke repository

---

### 🔵 Fase 1 — Auth & User System (Minggu 3-4)

**Tujuan**: Sistem autentikasi yang aman dan lengkap.

**Tasks:**
- [ ] Implementasi halaman `/login` dan `/register` dengan validasi form real-time
- [ ] Integrasi Supabase Auth (email/password) via `@supabase/ssr`
- [ ] Integrasi Google OAuth 2.0 via Supabase provider
- [ ] Setup Next.js middleware untuk proteksi route (redirect ke login jika unauthenticated)
- [ ] Implementasi `createServerClient` di middleware + `createBrowserClient` di client component
- [ ] Halaman forgot password + reset via email (magic link Supabase)
- [ ] Onboarding flow 3 langkah setelah registrasi pertama (nama, role, tujuan penggunaan)
- [ ] Setup TanStack Query v5 sebagai server state manager (provider, query client config)
- [ ] Row Level Security (RLS) di Supabase untuk semua tabel (users, projects, conversations, dll)
- [ ] Unit test: auth flows (login, register, redirect, session refresh)

**Deliverable**: User dapat register, login, logout, reset password, dan onboarding. TanStack Query siap digunakan di seluruh app.

---

### 🔵 Fase 2 — Hero Page & Landing (Minggu 5-6)

**Tujuan**: Halaman utama yang impresif sesuai referensi design.

**Tasks:**
- [ ] Implementasi video background dengan custom rAF fade system (sesuai spesifikasi detail)
- [ ] Navigation bar (transparan, backdrop blur, links, auth buttons)
- [ ] Hero content: badge (dari 21st.dev), headline, subtitle
- [ ] Komponen Search/Chat input box (credit info, AI branding, action buttons) — custom build
- [ ] Redirect logic: chat tanpa login → `/login?redirect=/`
- [ ] Animasi masuk halaman (Framer Motion v11)
- [ ] **21st.dev components** yang dipakai di landing:
  - Animated badge/pill untuk "New" indicator
  - Blur navbar component
  - Button variants (transparent + black)
- [ ] Responsiveness: desktop (1280px+), tablet (768px), mobile (375px)
- [ ] SEO: meta tags, Open Graph, sitemap via `next-sitemap`
- [ ] Performance audit: Lighthouse score ≥ 90, Next.js 15 built-in optimization

**Deliverable**: Landing page live di staging dengan design sesuai spesifikasi.

---

### 🔵 Fase 3 — AI Chat Engine & PRD Generation (Minggu 7-10)

**Tujuan**: Core feature — generasi PRD berbasis AI via OpenRouter.

**Tasks:**
- [ ] Setup **OpenRouter API** integration (`OPENROUTER_API_KEY` di server-side env)
- [ ] Desain system prompt untuk PRD generation (expert persona, format output Markdown strict)
- [ ] Implementasi model selection logic + fallback chain:
  ```
  Primary  : google/gemini-flash-1.5 (gratis, cepat)
  Fallback : meta-llama/llama-3.1-8b-instruct:free
  Premium  : google/gemini-pro-1.5 (untuk Hengker tier)
  ```
- [ ] Implementasi conversation state management (Zustand)
- [ ] UI komponen dari **21st.dev**: Chat bubble (user & AI), typing indicator, stream rendering
- [ ] Implementasi opsi dua mode: "Biarkan AI Memilih" vs "Pilih Sendiri"
- [ ] Form preferensi manual (semua field + validasi)
- [ ] **Next.js 15 Route Handler streaming** dengan `ReadableStream` (native SSE):
  ```typescript
  // app/api/chat/route.ts
  export async function POST(req: Request) {
    const stream = new ReadableStream({ ... })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    })
  }
  ```
- [ ] PRD section parser: extract dan label setiap section dari output AI via marker tags
- [ ] Loading state dengan progress messages (21st.dev loader component)
- [ ] Error handling: API timeout, quota exceeded, model unavailable, malformed response
- [ ] Rate limit check via tabel `rate_limits` di Supabase sebelum setiap AI call
- [ ] Simpan conversation history ke database
- [ ] Quota check sebelum setiap generation
- [ ] Integration test: end-to-end PRD generation flow dengan model gratis

**Deliverable**: User dapat chat dan menghasilkan PRD lengkap melalui dua mode, streaming real-time.

---

### 🔵 Fase 4 — PRD Viewer & Editor (Minggu 11-12)

**Tujuan**: Interface untuk melihat, merevisi, dan mengunduh PRD.

**Tasks:**
- [ ] Layout split-view: PRD panel (70%) + Chat panel (30%)
- [ ] Markdown renderer dengan syntax highlighting (react-markdown + rehype-highlight)
- [ ] Table of Contents yang sticky dan auto-generate dari heading
- [ ] Implementasi revisi PRD via chat (AI update section spesifik)
- [ ] PRD merger logic: update section tanpa mengganti keseluruhan dokumen
- [ ] Version history: simpan setiap revisi, UI untuk lihat diff
- [ ] Download `.md` (blob download di client)
- [ ] Rename PRD
- [ ] Tombol copy to clipboard untuk full content
- [ ] Collapse/expand chat panel
- [ ] Mobile: drawer chat dari bawah
- [ ] Toast notifikasi: "PRD diperbarui", "Download berhasil", dll

**Deliverable**: User dapat melihat, merevisi melalui chat, dan mengunduh PRD.

---

### 🔵 Fase 5 — Dashboard & PRD Management (Minggu 13)

**Tujuan**: Manajemen semua PRD yang pernah dibuat.

**Tasks:**
- [ ] Halaman `/dashboard` dengan grid/list PRD cards
- [ ] Search PRD by name/keyword
- [ ] Filter PRD: semua / draft / selesai / diarsipkan
- [ ] Sort: terbaru, terlama, nama A-Z
- [ ] Aksi per PRD: buka, rename, duplikasi, hapus, arsipkan
- [ ] Stats bar: total PRD, quota tersisa, plan aktif
- [ ] Empty state yang menarik (CTA untuk buat PRD pertama)
- [ ] Pagination atau infinite scroll

**Deliverable**: Dashboard lengkap untuk manajemen semua PRD.

---

### 🔵 Fase 6 — Pricing, Payment & Subscription (Minggu 14-15)

**Tujuan**: Sistem monetisasi yang fungsional dengan Midtrans Sandbox.

**Tasks:**
- [ ] Halaman `/pricing` dengan toggle bulanan/tahunan (komponen dari 21st.dev)
- [ ] Integrasi **Midtrans Sandbox SNAP API**:
  - Install: `npm install midtrans-client`
  - Gunakan `MIDTRANS_SERVER_KEY_SANDBOX` di server
  - Gunakan `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX` di client
  - Load script: `https://app.sandbox.midtrans.com/snap/snap.js`
- [ ] Implementasi Server Action untuk create Midtrans transaction token
- [ ] Webhook handler di `/api/payments/webhook`:
  - Verifikasi signature dari Midtrans
  - Update tabel `subscriptions` dan `quotas`
  - Trigger email via Resend
- [ ] Setup ngrok untuk expose webhook ke Midtrans Sandbox saat dev lokal
- [ ] Test semua skenario pembayaran di sandbox (sukses, gagal, pending, expire)
- [ ] Halaman `/settings/billing`: riwayat invoice, status plan, cancel subscription
- [ ] Notifikasi email via Resend: invoice, konfirmasi upgrade, peringatan quota
- [ ] Banner peringatan saat quota mendekati batas (80%, 100%) — 21st.dev toast/banner
- [ ] Download `.pdf` — unlock untuk Pro & Hengker (via `@react-pdf/renderer`)
- [ ] Share link PRD — generate unique token, public view endpoint `/prd/share/[token]`

**Deliverable**: Flow pembayaran sandbox berjalan end-to-end; quota dikelola otomatis post-payment.

---

### 🔵 Fase 7 — Fitur Pro & Hengker + Settings (Minggu 16-17)

**Tujuan**: Fitur eksklusif tier berbayar yang belum dibangun di fase sebelumnya, plus halaman Settings lengkap.

**Sub-fase 7A — Settings & Profile (semua tier)**
- [ ] Halaman `/settings/profile`: edit nama, foto avatar (upload ke Supabase Storage), role
- [ ] Halaman `/settings/account`: ganti email, ganti password, preferensi notifikasi email
- [ ] Halaman `/settings/billing`: status plan aktif, tanggal renewal, riwayat invoice, tombol cancel subscription
- [ ] Danger zone: hapus akun (soft delete + konfirmasi dua langkah)
- [ ] Notifikasi in-app preferences (quota warning, PRD selesai, dll)

**Sub-fase 7B — Fitur Eksklusif Pro**
- [ ] Version history diff viewer — tampilkan perubahan antar versi PRD secara visual (diff highlighting)
- [ ] Share link PRD — sudah dibuat tokennya di Fase 6, sekarang buat halaman public viewer `/prd/share/[token]` yang clean tanpa auth
- [ ] Revisi limit counter per PRD ditampilkan di UI (20x untuk Pro)

**Sub-fase 7C — Fitur Eksklusif Hengker**
- [ ] Custom PRD template: user bisa buat, simpan, dan pilih template struktur PRD sendiri
- [ ] Priority AI queue: flag request Hengker user agar diproses lebih dahulu (header atau model premium via OpenRouter)
- [ ] REST API untuk generate PRD programatically:
  - `POST /api/v1/generate` — kirim deskripsi, terima PRD dalam response
  - `GET /api/v1/projects` — list semua PRD
  - `GET /api/v1/projects/:id` — ambil PRD by ID
- [ ] API key management di `/settings/api`: generate, revoke, copy key
- [ ] Rate limiting per API key (terpisah dari rate limit web app)
- [ ] Analytics per user di dashboard: PRD views, download count, revision count, most active PRD

**Deliverable**: Settings lengkap untuk semua user. Fitur Pro dan Hengker fully functional dan ter-gate dengan benar sesuai tier.

---

### 🔵 Fase 8 — Polish, Testing & QA (Minggu 18-19)

**Tujuan**: Kualitas produk siap production.

**Tasks:**
- [ ] Comprehensive E2E testing (Playwright)
- [ ] Unit & integration test coverage ≥ 70%
- [ ] Accessibility audit (axe-core) + perbaikan
- [ ] Performance audit: Core Web Vitals, bundle size optimization
- [ ] Security audit: dependency scan, penetration test dasar, SQL injection check
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Load testing: simulasi 100 concurrent users
- [ ] Bug bash session dengan internal team
- [ ] User acceptance testing (UAT) dengan 5-10 beta tester
- [ ] Dokumentasi API (untuk Hengker tier)

**Deliverable**: Produk stabil, aman, dan performan siap launch.

---

### 🔵 Fase 9 — Launch & Post-Launch (Minggu 20+)

**Tujuan**: Go-live dan monitoring awal.

**Tasks:**
- [ ] Setup production environment (Vercel + Supabase Production)
- [ ] DNS configuration & SSL verification
- [ ] Database backup otomatis (daily)
- [ ] Monitoring dashboard (Sentry + Vercel Analytics + custom)
- [ ] Soft launch: undang 50 beta users
- [ ] Feedback collection (in-app + email survey)
- [ ] Fix critical bugs dari beta
- [ ] Public launch (Product Hunt, media sosial, komunitas)
- [ ] Iterasi berdasarkan feedback minggu pertama

**Deliverable**: Aplikasi live dan digunakan oleh pengguna nyata.

---

### 🔵 Fase 10 — Graphify Setup (Setelah Aplikasi Selesai Dibangun)

**Tujuan**: Install Graphify ke project NovaPlan agar AI coding assistant memiliki knowledge graph dari seluruh codebase — sehingga setiap sesi coding selanjutnya (debug, tambah fitur, refactor) jauh lebih cepat dan akurat karena AI navigasi via graph, bukan grep file satu per satu.

> ℹ️ **Apa itu Graphify?**  
> Graphify (repo resmi: `safishamsi/graphify`) adalah AI coding assistant skill open-source yang membangun knowledge graph dari seluruh isi project — kode, schema SQL, docs, gambar, PDF — menggunakan Tree-sitter + LLM semantic extraction. Hasilnya: AI coding assistant bisa query struktur project dengan **71.5x lebih hemat token** dibanding membaca raw files. Mendukung Claude Code, Cursor, Codex, Gemini CLI, Windsurf, dan banyak lagi.

> ⚠️ **Perhatian nama package**:  
> - CLI command: `graphify` (tanpa double-y)  
> - PyPI package name: `graphifyy` (double-y) — ini package resminya  
> - Repo resmi: `github.com/safishamsi/graphify`  
> - Package lain bernama `graphify*` di PyPI **bukan** dari project ini

**Requirements:**
- Python 3.10+
- Salah satu AI coding assistant yang sudah aktif di project

**Step 1 — Install Graphify CLI**
```bash
# Rekomendasi (Mac/Linux, PATH otomatis ter-setup)
uv tool install graphifyy && graphify install

# Atau dengan pipx
pipx install graphifyy && graphify install

# Atau plain pip
pip install graphifyy && graphify install
```

**Step 2 — Install skill ke AI coding assistant yang dipakai**

Pilih sesuai tool yang digunakan:
```bash
# Claude Code
graphify claude install

# Cursor
graphify cursor install

# Codex
graphify codex install
# (+ tambahkan multi_agent = true di ~/.codex/config.toml)

# Gemini CLI
graphify gemini install

# VS Code Copilot Chat
graphify vscode install

# Windsurf / OpenCode
graphify opencode install
```

**Step 3 — Build knowledge graph NovaPlan**
```bash
# Jalankan di root direktori project NovaPlan
/graphify .

# Output akan muncul di graphify-out/
# ├── graph.html        → visualisasi interaktif, buka di browser
# ├── GRAPH_REPORT.md   → ringkasan: god nodes, komunitas, surprising connections
# └── graph.json        → full graph, queryable anytime
```

**Step 4 — Commit graph ke repository**
```bash
git add graphify-out/
git commit -m "feat: add graphify knowledge graph"
```
> Commit `graphify-out/` ke git agar seluruh tim langsung punya map yang sama tanpa perlu rebuild.

**Step 5 — Cara pakai setelah install**
```bash
# Query struktur project
/graphify query "bagaimana auth flow bekerja?"
/graphify query "show the PRD generation pipeline"

# Cari path antar modul
/graphify path "OpenRouterService" "PRDMerger"

# Penjelasan node spesifik
/graphify explain "RateLimitMiddleware"

# Update graph setelah ada perubahan kode
/graphify update .

# Watch mode — auto-sync saat file berubah
/graphify . --watch
```

**Tasks:**
- [ ] Pastikan Python 3.10+ terinstall: `python --version`
- [ ] Install graphifyy: `uv tool install graphifyy` (rekomendasi) atau `pip install graphifyy`
- [ ] Jalankan `graphify install` untuk setup skill ke platform AI yang dipakai
- [ ] Jalankan `/graphify .` di root project untuk build knowledge graph
- [ ] Buka `graphify-out/graph.html` di browser untuk verifikasi graph terbentuk
- [ ] Baca `graphify-out/GRAPH_REPORT.md` — pastikan god nodes NovaPlan terdeteksi (OpenRouter, Supabase, PRD Merger, Auth Middleware, dll)
- [ ] Commit `graphify-out/` ke repository
- [ ] Setup `--watch` mode jika ingin auto-sync: `/graphify . --watch`

**Deliverable**: Knowledge graph NovaPlan aktif. AI coding assistant menavigasi codebase via graph — debug, refactor, dan tambah fitur jadi jauh lebih cepat dan kontekstual.

---

### 📊 Timeline Summary

| Fase | Minggu | Durasi |
|---|---|---|
| Fase 0: Foundation + Agent Skills Setup | 1-2 | 2 minggu |
| Fase 1: Auth + TanStack Query Setup | 3-4 | 2 minggu |
| Fase 2: Landing Page & Hero | 5-6 | 2 minggu |
| Fase 3: AI Engine (OpenRouter) | 7-10 | 4 minggu |
| Fase 4: PRD Viewer & Editor | 11-12 | 2 minggu |
| Fase 5: Dashboard & PRD Management | 13 | 1 minggu |
| Fase 6: Pricing & Payment (Midtrans Sandbox) | 14-15 | 2 minggu |
| Fase 7: Fitur Pro/Hengker + Settings Lengkap | 16-17 | 2 minggu |
| Fase 8: QA & Testing | 18-19 | 2 minggu |
| Fase 9: Launch & Post-Launch | 20+ | Ongoing |
| Fase 10: Graphify Setup (post-build) | Setelah Fase 9 | 1-2 hari |
| **Total** | **~20 minggu** | **~5 bulan** |

---

## 11. Use Case Diagram

```
                    ╔══════════════════════════════════════════════╗
                    ║           DOCIFY AI SYSTEM                   ║
                    ║                                              ║
  ┌──────────┐      ║  [UC-01] Register / Login                    ║
  │          │──────╬─►[UC-02] Google OAuth Login                  ║
  │  Guest   │      ║  [UC-03] Lihat Landing Page                  ║
  │  User    │──────╬─►[UC-04] Input Chat (redirect ke login)      ║
  └──────────┘      ║                                              ║
                    ║                                              ║
  ┌──────────┐      ║  [UC-05] Buat PRD (mode AI auto)             ║
  │          │──────╬─►[UC-06] Buat PRD (mode manual/form)         ║
  │ Logged-  │──────╬─►[UC-07] Lihat PRD                           ║
  │  in User │──────╬─►[UC-08] Revisi PRD via Chat                 ║
  │ (Free)   │──────╬─►[UC-09] Download PRD (.md)                  ║
  │          │──────╬─►[UC-10] Rename / Hapus PRD                  ║
  │          │──────╬─►[UC-11] Lihat Dashboard                     ║
  │          │──────╬─►[UC-12] Upgrade Plan                        ║
  └──────────┘      ║  [UC-13] Lihat Pricing                       ║
                    ║  [UC-14] Edit Profil                         ║
  ┌──────────┐      ║                                              ║
  │          │──────╬─►[UC-15] Download PRD (.pdf)    <<extend>>   ║
  │ Pro User │──────╬─►[UC-16] Share Link PRD          <<extend>>  ║
  │          │──────╬─►[UC-17] Lihat Version History  <<extend>>   ║
  └──────────┘      ║                                              ║
                    ║                                              ║
  ┌──────────┐      ║  [UC-18] Custom Template         <<extend>>  ║
  │ Hengker  │──────╬─►[UC-19] API Access              <<extend>>  ║
  │   User   │──────╬─►[UC-20] Priority AI Queue       <<extend>>  ║
  └──────────┘      ║                                              ║
                    ║                                              ║
  ┌──────────┐      ║  [UC-21] Kelola Semua User                   ║
  │  Admin   │──────╬─►[UC-22] Lihat Analytics Global              ║
  └──────────┘      ║  [UC-23] Manage Subscription                 ║
                    ╚══════════════════════════════════════════════╝
```

---

## 12. Sequence Diagram

### 12.1 Sequence: Generate PRD (Mode AI Auto)

```
User        Browser          Next.js Server      OpenRouter API      Supabase DB
 │               │                 │                   │                  │
 │──chat msg────►│                 │                   │                  │
 │               │──POST /api/chat►│                   │                  │
 │               │                 │──check rate_limits────────────────►  │
 │               │                 │◄──OK / Too Many Req────────────────  │
 │               │                 │──check quota──────────────────────►  │
 │               │                 │◄──quota OK────────────────────────   │
 │               │                 │──save user msg────────────────────►  │
 │               │                 │──build prompt +   │                  │
 │               │                 │  PRD expert system│                  │
 │               │                 │──POST (stream)───►│                  │
 │               │◄──SSE stream────│◄──SSE chunks──────│                  │
 │◄──live render─│                 │                   │                  │
 │               │                 │──save ai msg──────────────────────►  │
 │               │                 │──save PRD v1──────────────────────►  │
 │               │                 │──update quota─────────────────────►  │
 │               │◄──stream done───│                   │                  │
 │◄──PRD view────│                 │                   │                  │
```

### 12.2 Sequence: Revisi PRD via Chat

```
User        Browser          API Server        Claude AI         Database
 │               │                 │                │                │
 │──"tambahkan narasi X"──►│       │                │                │
 │               │──POST /revise──►│                │                │
 │               │                 │──load PRD ctx─────────────────►│
 │               │                 │◄──PRD content──────────────────│
 │               │                 │──load history─────────────────►│
 │               │                 │◄──last N msgs──────────────────│
 │               │                 │──revise PRD───►│                │
 │               │◄──SSE: updated section─────────◄─│                │
 │◄──live update─│                 │                │                │
 │               │                 │──save PRD v2───────────────────►│
 │               │                 │──save msg──────────────────────►│
 │               │◄──complete──────│                │                │
 │◄──version++───│                 │                │                │
```

### 12.3 Sequence: Payment & Upgrade

```
User        Browser          API Server        Midtrans         Database
 │               │                 │                │                │
 │──click Upgrade►│                 │                │                │
 │               │──POST /subscribe►│               │                │
 │               │                 │──create order─►│                │
 │               │                 │◄──snap_token───│                │
 │               │◄──snap_token────│                │                │
 │◄──SNAP popup──│                 │                │                │
 │──pay──────────►(Midtrans UI)                     │                │
 │               │                 │◄──webhook: success──────────────│
 │               │                 │──update sub────────────────────►│
 │               │                 │──update quota──────────────────►│
 │               │                 │──send email────────────────────►│
 │               │──poll/ws event─►│                │                │
 │◄──plan updated│                 │                │                │
```

---

## 13. Skenario Diagram

### Skenario 1: User Baru — Pertama Kali Buat PRD

```
AKTOR    : Andi (Product Manager, user baru)
TUJUAN   : Membuat PRD untuk aplikasi manajemen tugas tim
PRE-COND : Andi belum punya akun
POST-COND: PRD berhasil dihasilkan dan diunduh

LANGKAH:
1. Andi mengunjungi novaplan.ai
2. Andi mengetik "buatkan PRD untuk aplikasi manajemen tugas tim" di chat box
3. Sistem mendeteksi Andi belum login → redirect ke /login
4. Andi memilih "Daftar dengan Google" → berhasil register
5. Andi diarahkan ke onboarding (nama, role: "Product Manager", tujuan: "Dokumentasi produk")
6. Sistem redirect kembali ke home dengan chat context tersimpan
7. AI merespons: "Halo Andi! Aku sudah menangkap request kamu. Sebelum mulai, bagaimana cara kita melanjutkan?"
8. Muncul tombol [🤖 Biarkan AI Memilih] dan [✏️ Pilih Sendiri]
9. Andi memilih "Pilih Sendiri"
10. Form muncul: Andi mengisi nama app ("TaskFlow"), fitur utama (kanban, time tracking, notifikasi), platform (Web + Mobile), tech stack (React, Node.js), timeline (3 bulan), tim kecil (2-5 orang)
11. Andi klik "Generate PRD"
12. Loading screen muncul dengan progress messages
13. Setelah ~45 detik, PRD lengkap muncul di viewer
14. Andi membaca PRD dan mengetik di chat: "Bagian database schema kurang detail, bisa tambahkan relasi antar tabel?"
15. AI mengupdate section database schema
16. Andi puas dan klik Download .md
17. File PRD_TaskFlow.md terunduh ke komputer Andi

EXCEPTION:
- Jika Claude API timeout → tampilkan error "Sedang banyak permintaan, coba lagi" + retry button
- Jika form tidak lengkap → highlight field yang wajib diisi
```

### Skenario 2: User Gratis — Quota Habis

```
AKTOR    : Budi (user gratis, sudah membuat 3 PRD bulan ini)
TUJUAN   : Membuat PRD ke-4
PRE-COND : Budi sudah login, quota bulan ini = 3/3 (habis)
POST-COND: Budi diinformasikan dan diarahkan ke upgrade

LANGKAH:
1. Budi masuk ke dashboard, melihat "Quota: 3/3 — Habis"
2. Budi mencoba chat untuk buat PRD baru
3. Sebelum generation, sistem melakukan quota check
4. Sistem memblokir request dan menampilkan modal:
   "Quota PRD kamu untuk bulan ini sudah habis.
   Upgrade ke Pro untuk membuat 25 PRD/bulan — hanya Rp 25.000"
   [Upgrade Sekarang] [Mungkin Nanti]
5. Budi klik "Upgrade Sekarang"
6. Diarahkan ke halaman /pricing dengan Pro plan highlighted
7. Budi klik "Pilih Pro"
8. Midtrans SNAP popup terbuka
9. Budi bayar via GoPay
10. Konfirmasi sukses, quota direset ke 0/25
11. Budi kembali ke home dan berhasil buat PRD ke-4
```

### Skenario 3: User Pro — Revisi Besar PRD Lama

```
AKTOR    : Clara (Pro user, startup founder)
TUJUAN   : Membuka PRD lama dan melakukan revisi besar di beberapa section
PRE-COND : Clara sudah login, punya 5 PRD tersimpan, plan Pro aktif
POST-COND: PRD direvisi dan di-share ke tim

LANGKAH:
1. Clara membuka /dashboard, melihat daftar PRD
2. Clara klik PRD "E-commerce Platform v1" yang dibuat 2 minggu lalu
3. PRD viewer terbuka dengan split-view (PRD kiri, chat kanan)
4. Clara melihat PRD dan mengetik: "Hapus section Architecture yang lama dan ganti dengan microservices approach"
5. AI meminta konfirmasi: "Ini akan mengganti seluruh section Architecture. Lanjutkan?"
6. Clara konfirmasi → AI mengupdate section dengan pendekatan microservices
7. Clara lanjut: "Di User Flow, tambahkan alur untuk seller dashboard"
8. AI menambahkan sub-flow baru tanpa mengganggu section lain
9. Clara klik "Version History" → melihat 3 versi PRD (v1 original, v2, v3 terkini)
10. Clara klik ikon share → mendapatkan link publik read-only
11. Clara copy link dan kirim ke tim di Slack
12. Clara juga download .pdf untuk meeting besok
```

---

## 14. Rekomendasi Tambahan

### 14.1 🎯 Fitur yang Gw Rekomendasiin Masuk (Belum Disebutkan)

**A. PRD Template Library**
Sediakan galeri template PRD untuk kategori umum: SaaS, Mobile App, API Service, E-commerce, Dashboard/Analytics. User bisa pilih template sebagai starting point sebelum AI customize. Ini sangat membantu user yang masih awam dengan struktur PRD.

**B. AI Ambiguity Clarifier**
Sebelum generate, AI melakukan "smart questioning" — jika request user ambigu (misalnya "buat PRD untuk app sosial media"), AI bertanya 2-3 pertanyaan krusial yang akan berdampak besar pada output (target age group? monetisasi? fitur unik?). Jangan langsung tanya semua hal, tapi filter ke yang paling impactful.

**C. PRD Quality Score**
Setelah PRD di-generate, tampilkan "Completeness Score" (misalnya 87/100) dengan breakdown per section mana yang kurang detail. User bisa klik section tersebut dan minta AI untuk memperkuat section itu.

**D. Collaboration Mode (Roadmap)**
Untuk tim, izinkan multiple user mengerjakan PRD yang sama dengan komentar inline (seperti Google Docs). Ini bisa jadi fitur Hengker tier eksklusif dan driver konversi yang kuat.

**E. PRD Export ke Notion / Confluence**
Integrasi one-click untuk export PRD langsung ke workspace tool yang sudah ada. Ini menghilangkan friction besar bagi user enterprise.

**F. AI Persona Customization**
User bisa memilih "gaya" PRD yang dihasilkan: teknis (untuk engineer), bisnis (untuk stakeholder), atau hybrid. Ini mempengaruhi bahasa, level detail teknis, dan framing yang digunakan AI.

**G. Changelog Otomatis**
Setiap kali PRD direvisi, AI auto-generate satu baris changelog: "v3 — Ditambahkan microservices architecture & seller dashboard flow (10 Mei 2026)". Ini invaluable untuk audit trail.

**H. Onboarding Tour Interaktif**
Saat pertama kali login, tampilkan guided tour (Spotlight/Shepherd.js) yang menunjukkan setiap fitur utama. Ini drastis meningkatkan activation rate.

### 14.2 🏗️ Rekomendasi Teknis

**Streaming Architecture**: Implementasi SSE (Server-Sent Events) dari hari pertama untuk AI streaming. Jangan gunakan polling — UX-nya jauh lebih buruk dan lebih mahal di server.

**Optimistic Updates**: Saat user melakukan revisi, tampilkan perubahan secara optimistic di UI sambil request berjalan di background. Ini membuat aplikasi terasa jauh lebih cepat.

**PRD Chunking**: Untuk PRD panjang (>10.000 karakter), implement section-based update. AI hanya me-regenerate section yang diminta, bukan seluruh dokumen. Ini hemat token dan lebih akurat.

**Prompt Engineering yang Solid**: Investasi waktu lebih di desain system prompt. PRD yang buruk = user kecewa = churn. System prompt harus mendefinisikan: format output yang ketat, level detail tiap section, cara AI menangani ambiguitas, dan instruksi untuk tidak menghasilkan konten yang terlalu generik.

**Edge Caching**: Cache halaman landing page dan pricing di Vercel Edge untuk load time minimal dari berbagai region.

### 14.3 📈 Growth & Monetization Recommendations

**Freemium Hook yang Kuat**: Batas 3 PRD/bulan untuk free adalah angka yang tepat — cukup untuk user merasakan value, tapi tidak cukup untuk power user. Pastikan pengalaman 3 PRD pertama sangat luar biasa.

**Referral Program**: "Ajak 2 teman, dapat 1 bulan Pro gratis." Ini viral loop yang efektif untuk growth organik di komunitas developer Indonesia.

**Komunitas Discord**: Buat server Discord untuk user berbagi PRD mereka, diskusi, dan mendapat feedback dari sesama. Ini meningkatkan retention dan word-of-mouth.

**Content Marketing**: Publish artikel "Cara membuat PRD yang baik" di blog, optimasi SEO. Traffic organik yang masuk sudah intent-ready untuk produk ini.

**Product Hunt Launch**: Persiapkan launch di Product Hunt dengan konten visual yang kuat (demo GIF/video). Komunitas dev di sana adalah audience yang perfect.

---

## 15. Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|
| OpenRouter model gratis down/overloaded | Sedang | Tinggi | Fallback chain ke model gratis lain; caching hasil untuk prompt serupa |
| Kualitas output model gratis kurang baik | Sedang | Tinggi | Iterasi system prompt agresif; A/B test antar model; opsi upgrade model |
| User tidak puas dengan kualitas PRD | Tinggi | Tinggi | Feedback loop in-app; revisi unlimited untuk Hengker tier |
| Churn tinggi di plan berbayar | Sedang | Tinggi | Onboarding yang kuat; value delivery cepat |
| Midtrans Sandbox webhook gagal/delay | Sedang | Sedang | Idempotent webhook handler; retry mechanism; status polling fallback |
| Data breach / SQL injection | Rendah | Sangat Tinggi | RLS di Supabase; parameterized query; audit rutin |
| AI generate konten tidak relevan/tidak sesuai format | Sedang | Sedang | Validasi format output; structured output prompt; user bisa flag & retry |
| Rate limit DB-based lebih lambat dari Redis | Sedang | Rendah | Index yang tepat; cleanup job rutin; acceptable tradeoff tanpa Redis |
| Quota abuse (multi-account) | Sedang | Sedang | Email verification wajib; device fingerprinting; IP-based limit |
| OpenRouter pricing berubah (model jadi berbayar) | Rendah | Sedang | Monitor model availability; siapkan list model gratis alternatif |
| Skalabilitas saat viral | Rendah | Tinggi | Vercel auto-scale; Supabase connection pooler (PgBouncer built-in) |

---

## 16. Glossary

| Term | Definisi |
|---|---|
| PRD | Product Requirements Document — dokumen yang mendeskripsikan fitur, tujuan, dan requirement sebuah produk |
| OpenRouter | API gateway yang menyediakan akses ke banyak model AI (Gemini, Llama, Mistral, dll) dengan satu API key dan format OpenAI-compatible |
| SSE | Server-Sent Events — teknologi untuk server push data ke client secara real-time (satu arah), diimplementasikan via Next.js ReadableStream |
| rAF | requestAnimationFrame — Web API untuk animasi yang smooth dan efisien |
| RLS | Row Level Security — fitur Supabase/PostgreSQL untuk kontrol akses data di level baris |
| SNAP | Midtrans payment UI yang embed di website merchant. Sandbox = testing environment |
| Quota | Batasan jumlah PRD atau revisi yang bisa dibuat sesuai plan |
| Version History | Rekaman setiap versi PRD yang pernah disimpan di tabel `prd_versions` |
| Context Window | Batas jumlah token yang bisa diproses AI dalam satu request |
| Split-view | Layout dengan dua panel bersebelahan (PRD viewer + chat panel) |
| 21st.dev | Library komponen UI modern berbasis copy-paste, design-forward, animated — alternatif shadcn |
| TailwindCSS v4 | Versi terbaru Tailwind dengan engine baru (Oxide), konfigurasi via CSS bukan JS config |
| lru-cache | NPM package untuk in-process Least Recently Used cache, digunakan sebagai pengganti Redis untuk caching ringan |
| rate_limits | Tabel Supabase yang menyimpan request count per user per action per time window, sebagai pengganti Redis untuk rate limiting |
| @supabase/ssr | Package resmi Supabase untuk SSR frameworks (Next.js App Router), menggunakan `createBrowserClient` dan `createServerClient` |
| Onboarding | Proses orientasi user baru terhadap fitur-fitur aplikasi |

---

*Dokumen ini adalah living document. Diperbarui sesuai perkembangan produk.*  
*Dibuat dengan ❤️ — **NovaPlan** · "Dari ide ke PRD dalam 5 menit."*
