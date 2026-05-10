# NovaPlan — AI PRD Generator

> "Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari."

**NovaPlan** adalah platform berbasis web untuk men-generate Product Requirements Document (PRD) secara otomatis menggunakan kecerdasan buatan (AI) via OpenRouter.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript 5 |
| Styling | TailwindCSS v4 |
| UI Components | 21st.dev (copy-paste components) + Custom |
| Animation | Framer Motion v11 |
| State | Zustand v5 + TanStack Query v5 |
| Backend | Next.js API Routes / Server Actions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth 2.0 |
| AI Engine | OpenRouter API (Gemini Flash / Llama / Mistral) |
| Storage | Supabase Storage |
| Payments | Midtrans Sandbox (SNAP) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18.17+
- npm

### Install

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `MIDTRANS_SERVER_KEY_SANDBOX`
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX`
- `RESEND_API_KEY`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm run start
```

---

## Project Structure

```
novaplan_ai/
├── src/
│   ├── app/                # App Router (pages, layouts, API routes)
│   ├── components/
│   │   └── ui/             # Base UI components (21st.dev style)
│   ├── lib/
│   │   └── supabase/       # Supabase client helpers
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── migrations/             # Supabase SQL migration files
├── prd.md                  # Full Product Requirements Document
├── middleware.ts           # Auth guard middleware
├── next.config.ts
└── package.json
```

---

## Database

9 tabel di Supabase (semua dengan RLS enabled):
- `users`, `subscriptions`, `quotas`, `projects`, `prd_versions`, `conversations`, `messages`, `payments`, `rate_limits`

---

## Fase Pengerjaan

| Fase | Status |
|---|---|
| Fase 0 — Foundation & Setup | ✅ Selesai |
| Fase 1 — Auth & User System | 🔜 Next |
| Fase 2 — Hero Page & Landing | ⏳ Pending |
| Fase 3 — AI Chat Engine | ⏳ Pending |
| Fase 4 — PRD Viewer & Editor | ⏳ Pending |
| Fase 5 — Dashboard | ⏳ Pending |
| Fase 6 — Pricing & Payment | ⏳ Pending |
| Fase 7 — Pro/Hengker + Settings | ⏳ Pending |
| Fase 8 — QA & Testing | ⏳ Pending |
| Fase 9 — Launch | ⏳ Pending |
| Fase 10 — Graphify Setup | ⏳ Pending |

---

## Agent Skills

Skills yang terinstall untuk AI coding assistant:

1. `find-skills` — Menemukan skill tambahan yang dibutuhkan
2. `vercel-react-best-practices` — Best practices Next.js 15 + React 19
3. `supabase-postgres-best-practices` — Best practices Supabase + RLS

Verifikasi: `npx skills list -g`

---

*NovaPlan © 2026 — Built with ❤️*