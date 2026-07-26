# Techstack Migration Plan — NovaPlan AI

> **Tujuan:** Migrasi dari Next.js + InsForge (BaaS) ke TanStack Start + self-hosted stack lokal.
> **Prinsip:** Semua berjalan di local Docker. Gratis. Bertahap. Gak all-at-once.
> **Referensi riset:** Semua rekomendasi berdasarkan riset via Context7 + Official Docs (Q3 2026).
> **Project directory baru:** `C:\Coding\Web Development\Tanstack-start` — semua project sekarang berjalan di folder ini. Bukan upgrade in-place, project baru di direktori baru.

---

## Daftar Isi

1. [Ringkasan Stack Baru](#1-ringkasan-stack-baru)
2. [Perbandingan — Sekarang vs Nanti](#2-perbandingan--sekarang-vs-nanti)
3. [Alasan Pemilihan Tiap Komponen (dengan hasil riset)](#3-alasan-pemilihan-tiap-komponen)
4. [Komponen yang Gratis — Detail Lisensi](#4-komponen-yang-gratis)
5. [Analisis Dampak — Codebase Sekarang](#5-analisis-dampak)
6. [Rencana Migrasi Bertahap — 7 Fase](#6-rencana-migrasi-bertahap)
7. [Fase 0 — Persiapan Lingkungan Lokal](#fase-0--persiapan-lingkungan-lokal)
8. [Fase 1 — Database Layer (Drizzle + PostgreSQL)](#fase-1--database-layer-drizzle--postgresql)
9. [Fase 2 — Auth (Better Auth)](#fase-2--auth-better-auth)
10. [Fase 3 — Core Feature Layer](#fase-3--core-feature-layer)
11. [Fase 4 — AI Streaming (Vercel AI SDK + 9router)](#fase-4--ai-streaming-vercel-ai-sdk)
12. [Fase 5 — Quality of Life](#fase-5--quality-of-life)
13. [Fase 6 — Finalize & Cleanup](#fase-6--finalize--cleanup)
14. [Roadmap Visual](#14-roadmap-visual)
15. [Appendix: File-by-file migration checklist](#15-appendix-file-by-file-migration-checklist)

---

## 1. Ringkasan Stack Baru

| Layer | Pilihan | Lisensi | Docker? | Status |
|---|---|---|---|---|
| **Framework** | TanStack Start | MIT | ❌ | → pengganti Next.js |
| **Database** | PostgreSQL 17 | PostgreSQL License | ✅ | → pengganti InsForge DB |
| **ORM** | Drizzle ORM | Apache 2.0 | ❌ | → pengganti InsForge client |
| **Auth** | Better Auth | MIT | ❌ | → pengganti InsForge auth |
| **Auth RLS** | Drizzle `pgPolicy` + `pgRole` | (built-in) | ❌ | → pengganti RLS InsForge |
| **Admin/Service Role** | PG role `service_role` + 2 db clients | (built-in) | ❌ | → pengganti admin.ts |
| **Validation** | Zod V4 | MIT | ❌ | Validasi input |
| **Caching** | `node-cache` → Redis (nanti) | MIT → Redis SA | ✅ | |
| **Rate Limiting** | Better Auth built-in | MIT | ❌ | |
| **Realtime** | PG LISTEN/NOTIFY | (built-in) | ❌ | |
| **Background Jobs** | BullMQ + Redis | MIT | ✅ | (skip fase awal) |
| **Object Storage** | Lokal `uploads/` → MinIO | AGPLv3 | ✅ | (skip fase awal) |
| **Email** | Resend / Nodemailer + Ethereal | MIT | ❌ | |
| **Logging** | Pino | MIT | ❌ | |
| **Testing** | Vitest | MIT | ❌ | (udah ada) |
| **Lint/Format** | Biome | Apache 2.0 / MIT | ❌ | |
| **Search** | PG `tsvector` | (built-in) | ❌ | (skip) |
| **AI SDK** | Vercel AI SDK (via 9router) | MIT | ❌ | |

---

## 2. Perbandingan — Sekarang vs Nanti

### Arsitektur

```
SEKARANG                            NANTI
┌──────────────────────┐           ┌──────────────────────┐
│   Next.js 16         │           │  TanStack Start      │
│   App Router         │           │  File-based router   │
│                      │           │  + TanStack Router   │
├──────────────────────┤           ├──────────────────────┤
│   InsForge BaaS      │           │  PostgreSQL 17 lokal  │
│   (auth + DB + RLS)  │           │  + Drizzle ORM        │
│   @insforge/sdk/ssr  │           │  + Better Auth        │
│   18 file terikat     │           │  (full kontrol)      │
├──────────────────────┤           ├──────────────────────┤
│   ai-client manual    │           │  Vercel AI SDK        │
│   ai-orchestrator     │           │  + 9router (sama)     │
│   ~700 baris stream   │           │  ~50 baris stream     │
├──────────────────────┤           ├──────────────────────┤
│   ESLint + Prettier   │           │  Biome (satu tool)    │
│   Vitest (test)       │           │  Vitest (sama)        │
│   Zustand (store)     │           │  Zustand (sama)       │
└──────────────────────┘           └──────────────────────┘
```

### Performa Dev Server

| Aspek | Next.js (sekarang) | TanStack Start (nanti) |
|---|---|---|
| Bundler | Turbopack / Webpack | Vite |
| Cold start | 5-15 detik | <2 detik |
| Cache corruption risk | ✅ (sering) | ❌ (pake Vite, no persistent cache) |
| HMR | Stabil | Cepat |

---

## 3. Alasan Pemilihan Tiap Komponen

### 3.1. TanStack Start — vs Next.js
**[Sumber: TanStack Start comparison page, context7 — riset langsung]**

**Kenapa bukan Next.js:**
Framework sekarang (Next.js 16) mengalami Turbopack cache corruption berulang. Dev server crash karena corrupted `.sst` file — ini akar masalah "localhost gak bisa dibuka" yang lalu. Masalah ini spesifik Next.js + Turbopack persistent cache.

TanStack Start pake **Vite** sebagai bundler. Vite gak punya persistent cache yang bisa corrupted. Dev server start <2 detik.

**Perbedaan kunci:**

| Aspek | Next.js | TanStack Start |
|---|---|---|
| Bundler | Turbopack / Webpack | Vite |
| Routing | File-based (App Router) | File-based + TanStack Router |
| Server Functions | Server Actions | Server Functions (built-in Zod validation) |
| Caching | fetch cache (opaque) | TanStack Query eksplisit |
| React default | Server Components | Client-first (interactive default) |

**Kekurangan TanStack Start:**
- Ekosistem lebih kecil dari Next.js
- Dokumentasi masih berkembang
- Migrasi bukan upgrade in-place — perlu project baru

**Verdict:** Untuk aplikasi novaplan (PRD → AC → Task flow), TanStack Start lebih dari cukup. Stabilitas dev server > fitur-fitur Next.js yang gak kepake.

---

### 3.2. Drizzle ORM — vs Prisma vs Kysely
**[Sumber: Drizzle ORM docs, comparison pages — context7]**

| Aspek | Drizzle | Prisma | Kysely |
|---|---|---|---|
| Bundle size | Headless, 0 runtime deps | >15MB (engine binary) | Minimal |
| Query style | SQL-like (transparan) | Generated client | SQL-like |
| RLS support | ✅ `pgPolicy`, `pgRole`, `.withRLS()` | ❌ | ❌ |
| Migrations | Drizzle Kit (lokal, cepat) | Prisma Migrate | Manual |
| Performa | Near-zero overhead | Ada engine overhead | Ringan |
| Ekosistem | Zod, TanStack, Better Auth | Prisma Client | Terbatas |

**Kenapa Drizzle:**
Kunci utamanya: **Drizzle satu-satunya ORM dengan RLS native**. `pgPolicy()`, `pgRole()`, `.withRLS()` — ini kritis buat mengganti InsForge RLS yang otomatis. Output Drizzle transparan — lu tulis SQL-like, dapet SQL yang sama. Performa lebih cepat dari Prisma karena gak ada hidden engine binary.

Dari [sumber Drizzle docs](https://orm.drizzle.team/docs/rls): Drizzle support penuh `pgPolicy`, `pgRole`, `.link()` untuk policy ke existing table, dan integrasi dengan Neon/Supabase.

---

### 3.3. Better Auth — vs Auth.js vs Lucia vs Clerk
**[Sumber: Better Auth docs, comparison — context7]**

| Aspek | Better Auth | Auth.js (NextAuth) | Lucia | Clerk |
|---|---|---|---|---|
| Framework agnostic | ✅ | ❌ (Next.js first) | ✅ | N/A |
| Drizzle adapter | ✅ Native | ❌ | ✅ | N/A |
| Self-hosted | ✅ Gratis | ✅ Gratis | ✅ Gratis | ❌ Hosted |
| Rate limiter built-in | ✅ | ❌ | ❌ | ✅ (paid) |
| RBAC/Multi-tenant | ✅ Organization plugin | ❌ | ❌ | ✅ (paid) |
| Session cache (Redis) | ✅ | ❌ | ❌ | ✅ |
| 2FA, Magic Link, API Keys | ✅ (plugin) | ❌ | ❌ | ✅ (paid) |
| Ekosistem plugin | ✅ 30+ plugin | ❌ | ❌ | ❌ |
| Open source | ✅ MIT | ✅ MIT | ✅ MIT | ❌ |

**Kenapa Better Auth:**
Dari [sumber Better Auth docs](https://better-auth.com/docs/introduction): "framework-agnostic, universal authentication and authorization framework for TypeScript." Better Auth punya **semua** fitur yang InsForge sediain: OAuth, session refresh rotation, RBAC, API keys, rate limiter — plus kodenya di codebase sendiri.

Yang paling relevan buat lu: Better Auth gak perlu network call ke server hosted — session di-cookie + cache lokal. Ini nutup akar masalah "login ke-tendang" yang terjadi karena InsForge response time 10-30 detik.

Better Auth baru diakuisisi Vercel (July 2026) — maintainance jangka panjang terjamin. License MIT — self-host bebas.

---

### 3.4. Vercel AI SDK — vs Manual Streaming
**[Berdasarkan audit codebase: ~700 baris manual streaming vs ~50 baris SDK]**

**Sekarang (manual):**
- `src/lib/ai-client.ts` — custom `streamChat` async generator
- `src/lib/services/ai-orchestrator.ts` — 70 baris fallback/retry logic
- `src/app/api/chat/route.ts` — 422 baris SSE stream manual
- `src/app/api/ac/generate/route.ts` — 198 baris stream manual
- 48 titik kode yang handle chunk parsing, emit event, abort logic

**Nanti (SDK):**
```ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const model = openai("model-name", {
  baseURL: "http://localhost:20128/v1", // 9router tetap
});

const result = streamText({ model, messages, system: prompt });
// result.textStream — stream siap pakai
// result.finishReason — selesai
```

Dari [sumber AI SDK docs](https://sdk.vercel.ai): `streamText()` handle chunk parsing, abort (AbortSignal), timeout, fallback provider, structured output — built-in.

**Kenapa SDK:** Bukan karena "SDK lebih keren" — tapi karena **membuang ~650 baris kode manual yang rawan rusak**. Streaming code sekarang manual banget (`ReadableStream`, `TextDecoder`, buffer split, event emit). SDK udah di-test ribuan developer, handle semua edge case.

---

### 3.5. Redis — vs node-cache (untuk caching)
**[Sumber: Redis docs context7 + Better Auth session docs]**

Untuk development lokal single-process: **node-cache** cukup (library in-memory, gak perlu Docker).
Redis baru dibutuhin kalo:
1. Better Auth secondary storage untuk stateless session
2. BullMQ background job queue
3. Multiple instance aplikasi

Dari [sumber Redis docs](https://redis.io/docs/latest/develop/): Redis unggul di sub-millisecond response, pub/sub streaming, high-throughput. Tapi untuk local dev, node-cache tanpa overhead lebih praktis.

**Rekomendasi:** Mulai pake `node-cache`. Pas butuh Redis, tinggal tambah Docker service. Interface Better Auth `secondaryStorage` bedain `get/set/delete` — pindah backend tinggal ganti implementation.

---

### 3.6. MinIO — vs filesystem lokal
**[Sumber: MinIO docs — riset chrome manual]**

Untuk skala lokal: folder `uploads/` cukup. MinIO baru butuh kalo ada file upload user (avatar, gambar project).

Dari [sumber MinIO docs](https://min.io/docs/minio/container/index.html): MinIO adalah object storage S3-compatible, self-hosted pake Docker satu baris.

**Rekomendasi:** Skip MinIO dulu. Mulai pake folder lokal. Tambah MinIO nanti ketika butuh.

---

### 3.7. PostgreSQL LISTEN/NOTIFY — realtime
**[Sumber: PostgreSQL 18 LISTEN docs — riset chrome manual]**

Dari [sumber PostgreSQL docs](https://www.postgresql.org/docs/current/sql-listen.html): `LISTEN`/`NOTIFY` native PostgreSQL — gak perlu service tambahan. `NOTIFY` channel dari trigger DB. Client dengerin via `node-postgres`.

Alternatif dipertimbangkan:
- **Supabase Realtime** — hosted, gak bisa self-host ❌
- **Socket.io** — perlu server WebSocket terpisah
- **ElectricSQL** — terlalu berat untuk kasus penggunaan lu
- **PG LISTEN/NOTIFY** ✅ — native, gratis, built-in

---

### 3.8. Komponen Lainnya

**Zod** ([sumber](https://zod.dev)): Standar de facto TypeScript validation. Zod V4 baru rilis. TanStack Start pake Zod built-in buat validasi server functions. Better Auth juga pake Zod.

**Biome** ([sumber](https://biomejs.dev)): Satu tool buat lint + format. ESLint + Prettier sekarang perlu 50+ plugin dan lambat. Biome lebih cepat 10-100x.

**Pino** ([sumber](https://getpino.io)): Logger tercepat Node.js. Structured JSON. Alternatif Winston terlalu berat.

---

## 4. Komponen yang Gratis

| Komponen | Lisensi | Biaya | Catatan |
|---|---|---|---|
| TanStack Start | MIT | Gratis | Framework |
| PostgreSQL 17 | PostgreSQL License | Gratis | Database |
| Drizzle ORM | Apache 2.0 | Gratis | ORM |
| Better Auth | MIT | Gratis | Semua plugin gratis |
| Zod | MIT | Gratis | Validasi |
| MinIO | AGPLv3 | Gratis | Storage (skip dulu) |
| Redis | Redis Source Available | Gratis | Cache (skip dulu) |
| BullMQ | MIT | Gratis | Background jobs (skip dulu) |
| Nodemailer | MIT | Gratis | Email (butuh SMTP gratis) |
| Ethereal | — | Gratis | SMTP test |
| Pino | MIT | Gratis | Logging |
| Vitest | MIT | Gratis | Testing |
| Biome | Apache 2.0 / MIT | Gratis | Lint/Format |
| Vercel AI SDK | MIT | Gratis | AI streaming |
| PG LISTEN/NOTIFY | PostgreSQL License | Gratis | Realtime |
| **Total** | | **Rp 0** | **Semua gratis** |

---

## 5. Analisis Dampak — Codebase Sekarang

### Statistik

- **189 source files** (.ts / .tsx)
- **38 API routes** + ~12 page files
- **85+ titik InsForge** di 18 file
- **~700 baris** AI streaming manual

### Layer yang Terpengaruh

#### A. Database Queries (~40 titik)
Semua `insforge.database.from(...)` → Drizzle `db.select().from(...)`.

#### B. Auth Flow (~20 titik)
- `createServerInsforge()` → Better Auth server instance
- `insforge.auth.getCurrentUser()` → `auth.api.getSession({ headers })`
- `@insforge/sdk/ssr` → Better Auth cookie management
- `middleware.ts` → TanStack Start loader + Better Auth
- OAuth callback, refresh, sign-in, sign-out → hapus, ganti

#### C. Schema/Tabel yang perlu di-migrate ke Drizzle
```
users, subscriptions, quotas, projects, prd_versions,
conversations, messages, payments, ac_versions,
notifications, tasks, subtasks, sitemap_pages, api_keys,
rate_limits
```

#### D. AI Streaming (~700 baris)
`ai-client.ts`, `ai-orchestrator.ts`, `chat/route.ts`, `ac/generate/route.ts` — ganti ke Vercel AI SDK.

#### E. File yang TIDAK Berubah

| Alasan | File |
|---|---|
| State management | `src/store/index.ts` (Zustand) — library sama |
| UI components | `src/components/*` — migration pure (gak perlu sentuh) |
| Hooks | `src/hooks/*` — sama |
| Pricing data | `src/lib/pricing-data.ts` — pure data |
| Prompts | `src/lib/prompts*.ts` — pure string template |
| Actions | `src/app/actions/*` — cuma ganti `insforge` → `db` |

---

## 6. Rencana Migrasi Bertahap — 7 Fase

```
Fase 0 ─ Persiapan lingkungan lokal (Docker + tooling)
   │
Fase 1 ─ Database layer (Drizzle + PostgreSQL)
   │        Schema, migrations, query utilities, admin client
   │
Fase 2 ─ Auth (Better Auth)
   │        Users, sessions, OAuth, cookie management
   │
Fase 3 ─ Core feature layer
   │        Port semua query DB ke Drizzle, route handler baru
   │
Fase 4 ─ AI Streaming (Vercel AI SDK)
   │        Ganti manual stream + fallback ke SDK
   │
Fase 5 ─ Quality of Life
   │        Logging, lint, background jobs
   │
Fase 6 ─ Finalize & cleanup
   │        Hapus InsForge SDK, file lama, testing
```

---

## Fase 0 — Persiapan Lingkungan Lokal

### 0.1. Prasyarat
- Docker Desktop (Windows) — untuk PostgreSQL
- Node.js 22 LTS
- pnpm (`npm install -g pnpm`)
- Git

### 0.2. Docker Compose — PostgreSQL
```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: novaplan
      POSTGRES_PASSWORD: novaplan_local
      POSTGRES_DB: novaplan
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 0.3. Inisialisasi TanStack Start

Project baru di direktori terpisah — bukan upgrade in-place di folder Next.js lama.

```bash
# Buat direktori project baru
# Pindah ke lokasi yang sudah ditentukan
mkdir -p "C:\Coding\Web Development\Tanstack-start"
cd "C:\Coding\Web Development\Tanstack-start"
pnpm create @tanstack/start@latest novaplan
cd novaplan
```

### 0.4. Pindahkan file yang gak perlu perubahan

```bash
# Sumber: project Next.js lama
# Tujuan: C:\Coding\Web Development\Tanstack-start\novaplan

cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\components" ./src/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\hooks" ./src/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\store" ./src/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\types" ./src/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\lib\prompts"*.ts ./src/lib/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\lib\pricing-data.ts" ./src/lib/
cp -r "C:\Coding\Web Development\Next\novaplan_ai\src\lib\utils.ts" ./src/lib/

# Catatan: pastikan path sumber benar sesuai lokasi project Next.js lama
# C:\Coding\Web Development\Next\novaplan_ai
```

### 0.5. Install dependensi inti
```bash
# Core framework
pnpm add @tanstack/react-router @tanstack/react-query
pnpm add tailwindcss @tailwindcss/vite

# Database
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Auth
pnpm add better-auth

# AI SDK
pnpm add ai @ai-sdk/openai

# Validation + Utility
pnpm add zod pino

# Dev
pnpm add -D @biomejs/biome vitest
```

---

## Fase 1 — Database Layer (Drizzle + PostgreSQL)

### 1.1. Setup Drizzle Config
```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  entities: {
    roles: true, // manage pgRole via Drizzle
  },
});
```

### 1.2. Schema — Tabel NovaPlan
```ts
// src/db/schema.ts
import {
  pgTable,
  pgRole,
  pgPolicy,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  sql,
} from "drizzle-orm/pg-core";

// === ROLES ===
export const authenticated = pgRole("authenticated").existing();
export const serviceRole = pgRole("service_role");

// === TABLES ===

// Users (Better Auth akan generate + merge)
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    emailVerified: boolean("email_verified").default(false),
    image: text("image"),
    fullName: text("full_name"),
    company: text("company"),
    role: text("role"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("users_self_policy", {
      for: "all",
      to: authenticated,
      using: sql`id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Subscriptions
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    plan: text("plan").notNull().default("free"), // free, pro, hengker
    status: text("status").notNull().default("active"),
    midtransOrderId: text("midtrans_order_id"),
    subscriptionType: text("subscription_type"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("subscriptions_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Quotas
export const quotas = pgTable(
  "quotas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    prdUsed: integer("prd_used").default(0),
    prdLimit: integer("prd_limit").default(-1),
    revisionUsed: integer("revision_used").default(0),
    revisionLimit: integer("revision_limit").default(-1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("quotas_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Projects
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("draft"),
    mode: text("mode").default("ai_auto"),
    step: text("step").default("prd"), // prd, ac, task
    acStatus: text("ac_status").default("pending"),
    taskStatus: text("task_status").default("pending"),
    shareToken: text("share_token"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("projects_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Prd Versions
export const prdVersions = pgTable(
  "prd_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    changeSummary: text("change_summary"),
    // ponytail: JSONB column, string value — mirror existing pattern
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    pgPolicy("prd_versions_project", {
      for: "all",
      to: authenticated,
      using: sql`project_id IN (SELECT id FROM projects WHERE user_id = current_setting('app.user_id')::text)`,
    }),
  ],
);

// Ac Versions
export const acVersions = pgTable(
  "ac_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    pgPolicy("ac_versions_project", {
      for: "all",
      to: authenticated,
      using: sql`project_id IN (SELECT id FROM projects WHERE user_id = current_setting('app.user_id')::text)`,
    }),
  ],
);

// Conversations
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    projectId: text("project_id").references(() => projects.id),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("conversations_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Messages
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id),
    role: text("role").notNull(), // user, assistant, system
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    pgPolicy("messages_conversation", {
      for: "all",
      to: authenticated,
      using: sql`conversation_id IN (SELECT id FROM conversations WHERE user_id = current_setting('app.user_id')::text)`,
    }),
  ],
);

// Tasks
export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("pending"),
    priority: text("priority").default("medium"),
    assignee: text("assignee"),
    dependencies: jsonb("dependencies"),
    subtasks: jsonb("subtasks"),
    position: jsonb("position"), // { x, y } for kanban
    order: integer("order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("tasks_project", {
      for: "all",
      to: authenticated,
      using: sql`project_id IN (SELECT id FROM projects WHERE user_id = current_setting('app.user_id')::text)`,
    }),
  ],
);

// Sitemap Pages
export const sitemapPages = pgTable(
  "sitemap_pages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    path: text("path"),
    title: text("title"),
    type: text("type"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    pgPolicy("sitemap_project", {
      for: "all",
      to: authenticated,
      using: sql`project_id IN (SELECT id FROM projects WHERE user_id = current_setting('app.user_id')::text)`,
    }),
  ],
);

// Api Keys
export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    pgPolicy("api_keys_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Rate Limits (untuk kustom selain Better Auth)
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").default(1),
  },
  (table) => [
    pgPolicy("rate_limits_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);

// Payments
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    orderId: text("order_id").notNull().unique(),
    plan: text("plan").notNull(),
    amount: integer("amount"),
    status: text("status").default("pending"),
    midtransResponse: jsonb("midtrans_response"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    pgPolicy("payments_self", {
      for: "all",
      to: authenticated,
      using: sql`user_id = current_setting('app.user_id')::text`,
    }),
  ],
);
```

### 1.3. DB Utilities
```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Regular client — RLS aktif (set app.user_id)
export const db = drizzle(postgres(connectionString), { schema });

// Admin client — bypass RLS (service_role)
export const adminDb = drizzle(
  postgres(connectionString, {
    connection: { search_path: "service_role,schemas" },
  }),
  { schema }
);
```

### 1.4. Generate + Migrate
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 1.5. Verifikasi
```bash
pnpm vitest run
```

---

## Fase 2 — Auth (Better Auth)

### 2.1. Better Auth Server Instance
```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { ac, admin, member } from "@/lib/auth-permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      ac,
      roles: { admin, member },
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60, // 60 detik
    max: 100,   // 100 request per window
  },
  session: {
    cookieCache: {
      // Cookie cache biar gak query DB tiap request
      enabled: true,
      maxAge: 5 * 60, // 5 menit
    },
  },
});
```

### 2.2. Better Auth Client
```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
});
```

### 2.3. Middleware — Auth Check
```ts
// Di tiap route loader / server function
import { auth } from "@/lib/auth";

export async function requireAuth(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");
  return session;
}
```

### 2.4. Ganti query `insforge.auth.getCurrentUser()`

Pola baru di semua API route:
```ts
// OLD:
const { data: { user } } = await insforge.auth.getCurrentUser();
const { data: subscription } = await insforge.database
  .from("subscriptions").select("plan")
  .eq("user_id", user.id).maybeSingle();

// NEW:
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

const session = await auth.api.getSession({ headers: requestHeaders });
const user = session?.user;

const [sub] = await db.select()
  .from(subscriptions)
  .where(eq(subscriptions.userId, user.id))
  .limit(1);
```

### 2.5. File Auth Routes — Baru

Better Auth handle sendiri OAuth flow. Yang perlu dibuat:
- `src/routes/api/auth/sign-in.ts` → `auth.api.signInEmail()`
- `src/routes/api/auth/sign-up.ts` → `auth.api.signUpEmail()`
- `src/routes/api/auth/sign-out.ts` → `auth.api.signOut()`

Better Auth handle refresh, cookie, session management otomatis. Routes OAuth ga perlu — Better Auth sediain endpoint `/api/auth/oauth2/callback` dan `/api/auth/oauth2/authorize` built-in.

### 2.6. Rate Limit — Pakai Better Auth
```ts
// Rate limit Better Auth handle di config:
rateLimit: {
  enabled: true,
  window: 60,
  max: 100,
  customRules: {
    "/api/ac/generate": { window: 300, max: 10 },
    "/api/prd/generate": { window: 300, max: 10 },
  },
}
```

---

## Fase 3 — Core Feature Layer

### 3.1. Server Function Pattern
```ts
// src/lib/server/projects.ts
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getProject = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, data.id))
      .limit(1);
    return project;
  });
```

### 3.2. Route Migration — per File

Daftar route yang perlu dimigrasi dari Next.js ke TanStack Start:

| Next.js Path | TanStack Start Path | Prioritas |
|---|---|---|
| `src/app/api/projects/route.ts` | `src/routes/api/projects.ts` | HIGH |
| `src/app/api/projects/[id]/route.ts` | `src/routes/api/projects/$id.ts` | HIGH |
| `src/app/api/chat/route.ts` | `src/routes/api/chat.ts` | HIGH |
| `src/app/api/ac/generate/route.ts` | `src/routes/api/ac/generate.ts` | HIGH |
| `src/app/api/ac/revise/route.ts` | `src/routes/api/ac/revise.ts` | HIGH |
| `src/app/api/ac/save/route.ts` | `src/routes/api/ac/save.ts` | HIGH |
| `src/app/api/user/plan/route.ts` | `src/routes/api/user/plan.ts` | MEDIUM |
| `src/app/api/task/...` | `src/routes/api/task/...` | MEDIUM |
| `src/app/api/kanban/...` | `src/routes/api/kanban/...` | MEDIUM |
| `src/app/api/payments/...` | `src/routes/api/payments/...` | LOW |
| `src/app/api/export/...` | `src/routes/api/export/...` | LOW |
| `src/app/api/feedback/route.ts` | `src/routes/api/feedback.ts` | LOW |
| `src/app/api/report-error/route.ts` | `src/routes/api/report-error.ts` | LOW |
| `src/app/api/v1/...` | `src/routes/api/v1/...` | LOW |

### 3.3. Query Migration — Pattern per Case

**Case 1: Single row read**
```ts
// OLD:
const { data: project } = await insforge.database
  .from("projects")
  .select("id")
  .eq("id", projectId)
  .eq("user_id", user.id)
  .maybeSingle();

// NEW:
import { projects } from "@/db/schema";
const [project] = await db.select({ id: projects.id })
  .from(projects)
  .where(and(
    eq(projects.id, projectId),
    eq(projects.userId, user.id),
  ))
  .limit(1);
```

**Case 2: Insert + return**
```ts
// OLD:
const { data: inserted, error } = await insforge.database
  .from("prd_versions").insert([{ ... }]).select();

// NEW:
const [inserted] = await db.insert(prdVersions)
  .values({ ... })
  .returning();
```

**Case 3: Update**
```ts
// OLD:
await insforge.database.from("projects")
  .update({ ac_status: "generating" })
  .eq("id", projectId);

// NEW:
await db.update(projects)
  .set({ acStatus: "generating" })
  .where(eq(projects.id, projectId));
```

**Case 4: Admin (bypass RLS)**
```ts
// OLD:
const { getAdminInsforge } = await import("@/lib/insforge/admin");
const adminInsforge = await getAdminInsforge();
await adminInsforge.database.from("subscriptions").upsert(...);

// NEW:
import { adminDb } from "@/db";
await adminDb.insert(subscriptions).values({ ... })
  .onConflictDoUpdate({ target: subscriptions.id, set: { ... } });

// Atau: update langsung pake SQL
await adminDb.execute(
  sql`UPDATE subscriptions SET status = ${status} WHERE id = ${id}`
);
```

### 3.4. Background Jobs — (Optional Fase 3, lebih baik ditunda Fase 5)

Untuk generate PRD/AC yang sekarang blocking:
```ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis-connection";

export const aiQueue = new Queue("ai-generation", { connection });

export async function enqueueGenerate(params: { projectId: string, userId: string, type: "prd" | "ac" }) {
  await aiQueue.add("generate", params, {
    removeOnComplete: true,
    attempts: 3,
  });
}
```

**Tunda sampai BullMQ sudah terinstall dengan Redis.**

### 3.5. Service Files Migration

| Old File | New File | Notes |
|---|---|---|
| `src/lib/services/prd-service.ts` | `src/lib/server/prd.ts` | Ganti query ke Drizzle |
| `src/lib/services/ac-service.ts` | `src/lib/server/ac.ts` | Ganti query ke Drizzle |
| `src/lib/services/error-sanitizer.ts` | `src/lib/error-sanitizer.ts` | Pure function — sama |
| `src/lib/services/db-retry.ts` | Hapus | Drizzle query gak perlu retry wrapper |

---

## Fase 4 — AI Streaming (Vercel AI SDK + 9router)

### 4.1. Install SDK
```bash
# (udah diinstall di Fase 0)
pnpm add ai @ai-sdk/openai
```

### 4.2. AI Generate Function
```ts
// src/lib/ai/generate.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const NINE_ROUTER_URL = process.env.NINE_ROUTER_URL || "http://localhost:20128";

function getModel(modelName: string) {
  return openai(modelName, {
    baseURL: `${NINE_ROUTER_URL}/v1`,
  });
}

// Generate PRD — streaming
export async function generatePrd(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; signal?: AbortSignal },
) {
  const model = getModel(options?.model || "gpt-4o");

  const result = streamText({
    model,
    messages,
    system: systemPrompt,
    abortSignal: options?.signal,
  });

  return result;
}

// Generate AC — stateless
export async function generateAc(
  prdContent: string,
  options?: { model?: string; signal?: AbortSignal },
) {
  const model = getModel(options?.model || "gpt-4o");
  const systemPrompt = `${AC_GENERATION_PROMPT}\n\n--- PRD CONTENT ---\n${prdContent}`;

  return streamText({
    model,
    messages: [
      { role: "user" as const, content: "Generate acceptance criteria based on the PRD above." },
    ],
    system: systemPrompt,
  });
}
```

### 4.3. Route Handler PRD
```ts
// src/routes/api/chat.ts — Menggantikan src/app/api/chat/route.ts (422 baris)
// Jadi ~40 baris

import { createServerFn } from "@tanstack/start";
import { generatePrd } from "@/lib/ai/generate";

export const chat = createServerFn({ method: "POST" })
  .validator((input: {
    projectId: string;
    message: string;
    conversationId?: string;
  }) => input)
  .handler(async ({ data }) => {
    // Check auth
    // Check rate limit
    // Simpan message ke DB (conversations + messages)

    const systemPrompt = buildPrompt(data.message);
    const result = await generatePrd(systemPrompt, [
      { role: "user", content: data.message },
    ]);

    // Return stream
    return result.toDataStreamResponse();
  });
```

### 4.4. Route Handler AC
```ts
// src/routes/api/ac/generate.ts — Menggantikan 198 baris → ~30 baris

import { createServerFn } from "@tanstack/start";
import { generateAc } from "@/lib/ai/generate";

export const generateAcHandler = createServerFn({ method: "POST" })
  .validator((input: { projectId: string }) => input)
  .handler(async ({ data }) => {
    const session = await requireAuth(requestHeaders);
    const prdContent = await getLatestPrdContent(data.projectId);

    const result = await generateAc(prdContent);

    // Collect full response
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    // Save ke DB
    await saveAcVersion(data.projectId, fullText);

    return { success: true };
  });
```

---

## Fase 5 — Quality of Life

### 5.1. Logging — Pino
```ts
// src/lib/logger.ts
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

// Usage:
// logger.info({ projectId }, "Project created");
// logger.error({ err, userId }, "Failed to generate PRD");
```

### 5.2. Biome — Lint & Format
```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "complexity": { "noBannedTypes": "off" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": { "formatter": { "quoteStyle": "double" } }
}
```

### 5.3. Background Jobs — BullMQ (Opsional Fase 5)
```ts
// src/lib/queue.ts
import { Queue, Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const aiQueue = new Queue("ai-generation", { connection });

export const aiWorker = new Worker("ai-generation", async (job) => {
  const { projectId, type } = job.data;
  // Generate PRD/AC di background
  // Update project status via adminDb
  // Notify user via WebSocket
}, { connection });
```

---

## Fase 6 — Finalize & Cleanup

### 6.1. Hapus Dependensi Lama
```bash
pnpm remove @insforge/sdk @sentry/nextjs eslint prettier
```

### 6.2. Hapus File InsForge
```bash
rm -rf src/lib/insforge/
rm src/lib/ai-client.ts
rm src/lib/services/ai-orchestrator.ts
rm src/middleware.ts
rm -rf src/app/api/auth/
rm -rf src/app/api/v1/
# plus file migration lainnya
```

### 6.3. Testing
```bash
pnpm vitest run
pnpm biome check src/
```

### 6.4. Verifikasi Manual
- [ ] Sign up, sign in, sign out
- [ ] OAuth Google login
- [ ] Generate PRD (streaming dari 9router via AI SDK)
- [ ] Generate AC (streaming)
- [ ] CRUD project
- [ ] Task/Kanban
- [ ] Payment (Midtrans webhook)
- [ ] Middleware auth check di semua route
- [ ] Protected routes gak bisa diakses tanpa session
- [ ] Public routes bisa diakses

---

## 7. Roadmap Visual

```
Minggu 1 ─── Fase 0 & 1 ─── Setup Docker + Drizzle schema + migrate DB
                               │
Minggu 2 ─── Fase 2    ─────── Better Auth integration
                               │
Minggu 3-4 ─── Fase 3 ──────── Port semua API route ke Server Functions
                               │
Minggu 5 ─── Fase 4    ──────── AI SDK (ganti streaming manual)
                               │
Minggu 6 ─── Fase 5    ──────── Logging, lint, background jobs
                               │
Minggu 7 ─── Fase 6    ──────── Cleanup + testing
                               │
Done ────── Aplikasi berjalan di TanStack Start + Postgres lokal
```

---

## 8. Appendix — File-by-file Migration Checklist

### 8.1. InsForge Files (18 files, 85+ titik)

| # | File | Yang Diubah |
|---|---|---|
| 1 | `src/middleware.ts` | Hapus — ganti pake TanStack Start loader auth per route |
| 2 | `src/lib/insforge/server.ts` | Hapus — ganti `src/db/index.ts` + `src/lib/auth.ts` |
| 3 | `src/lib/insforge/client.ts` | Hapus — ganti `src/lib/auth-client.ts` |
| 4 | `src/lib/insforge/auth-cookies.ts` | Hapus — Better Auth handle cookie |
| 5 | `src/lib/insforge/resilient-fetch.ts` | Hapus — gak perlu |
| 6 | `src/lib/insforge/admin.ts` | Hapus — ganti `adminDb` dari `src/db/index.ts` |
| 7 | `src/lib/auth.ts` | Ganti isi ke Better Auth server instance |
| 8 | `src/lib/services/prd-service.ts` | Ganti query — port ke Drizzle |
| 9 | `src/lib/services/ac-service.ts` | Ganti query — port ke Drizzle |
| 10 | `src/lib/rate-limit.ts` | Hapus — ganti Better Auth rate limit |
| 11 | `src/app/api/auth/me/route.ts` | Hapus — ganti `auth.api.getSession()` |
| 12 | `src/app/api/auth/sign-in/route.ts` | Hapus — Better Auth handle |
| 13 | `src/app/api/auth/sign-up/route.ts` | Hapus — Better Auth handle |
| 14 | `src/app/api/auth/sign-out/route.ts` | Hapus — Better Auth handle |
| 15 | `src/app/api/auth/refresh/route.ts` | Hapus — Better Auth handle |
| 16 | `src/app/api/auth/oauth/google/route.ts` | Hapus — Better Auth handle |
| 17 | `src/app/api/auth/oauth/callback/route.ts` | Hapus — Better Auth handle |
| 18 | `src/app/api/auth/onboarding/route.ts` | Migrasi ke Drizzle |

### 8.2. Files dengan Query DB (partial list, ~40 titik)

| # | File | Jumlah query |
|---|---|---|
| 1 | `src/app/api/ac/generate/route.ts` | ~6 query |
| 2 | `src/app/api/ac/revise/route.ts` | ~5 query |
| 3 | `src/app/api/chat/route.ts` | ~8 query |
| 4 | `src/app/api/user/plan/route.ts` | ~3 query |
| 5 | `src/app/api/projects/route.ts` | ~2 query |
| 6 | `src/app/api/projects/[id]/route.ts` | ~2 query |
| 7 | `src/app/api/ac/save/route.ts` | ~2 query |
| 8 | `src/app/api/payments/create/route.ts` | ~3 query |
| 9 | `src/app/api/payments/webhook/route.ts` | ~3 query |
| 10 | `src/app/api/settings/api-keys/*` | ~4 query |
| 11 | `src/app/api/feedback/route.ts` | ~1 query |
| 12 | `src/app/api/task/*` | ~4 query |
| 13 | `src/app/api/kanban/*` | ~3 query |
| 14 | `src/app/api/sitemap/*` | ~2 query |
| 15 | `src/app/actions/payment.ts` | ~3 query |
| 16 | `src/app/actions/settings.ts` | ~5 query |
| 17 | `src/app/actions/prd.ts` | ~3 query |
| 18 | `src/app/actions/notifications.ts` | ~1 query |

### 8.3. AI Streaming Files

| File | Baris | Aksi |
|---|---|---|
| `src/lib/ai-client.ts` | ~40 | Hapus — ganti Vercel AI SDK |
| `src/lib/services/ai-orchestrator.ts` | 70 | Hapus — ganti `src/lib/ai/generate.ts` |
| `src/app/api/chat/route.ts` | 422 | Migrasi ke Server Function |
| `src/app/api/ac/generate/route.ts` | 198 | Migrasi ke Server Function |
| `src/app/api/ac/revise/route.ts` | ~150 | Migrasi ke Server Function |
| `src/components/chat/chat-panel.tsx` | (UI) | Client SDK + TanStack Query |
| `src/components/ac/ac-detail.tsx` | (UI) | Client SDK + TanStack Query |

---

## 8.4. ⚠️ COMPLETENESS CHECKLIST — JANGAN ADA YANG TERTINGGAL

> **WAJIB:** Sebelum menyatakan migrasi selesai, checklist berikut harus 100% terpenuhi.
> Jangan pindah ke fase berikutnya sebelum fase sebelumnya benar-benar clean.

### 8.4.1. Semua Pages — 21 Halaman

| # | Halaman (Next.js) | Status Migrasi | Halaman Baru (TanStack Start) |
|---|---|---|---|
| 1 | `src/app/page.tsx` (Home) | ☐ | `src/routes/index.tsx` |
| 2 | `src/app/login/page.tsx` | ☐ | Auth pakai Better Auth |
| 3 | `src/app/register/page.tsx` | ☐ | Auth pakai Better Auth |
| 4 | `src/app/forgot-password/page.tsx` | ☐ | Auth pakai Better Auth |
| 5 | `src/app/reset-password/page.tsx` | ☐ | Auth pakai Better Auth |
| 6 | `src/app/onboarding/page.tsx` | ☐ | `src/routes/onboarding.tsx` |
| 7 | `src/app/pricing/page.tsx` | ☐ | `src/routes/pricing.tsx` |
| 8 | `src/app/auth/callback/page.tsx` | ☐ | Better Auth handle |
| 9 | `src/app/prd/[id]/page.tsx` | ☐ | `src/routes/prd/$id.tsx` |
| 10 | `src/app/prd/share/[token]/page.tsx` | ☐ | `src/routes/prd/share/$token.tsx` |
| 11 | `src/app/ac/[id]/page.tsx` | ☐ | `src/routes/ac/$id.tsx` |
| 12 | `src/app/task/[id]/page.tsx` | ☐ | `src/routes/task/$id.tsx` |
| 13 | `src/app/kanban/[id]/page.tsx` | ☐ | `src/routes/kanban/$id.tsx` |
| 14 | `src/app/setup/page.tsx` | ☐ | `src/routes/setup/index.tsx` |
| 15 | `src/app/setup/manual/page.tsx` | ☐ | `src/routes/setup/manual.tsx` |
| 16 | `src/app/settings/page.tsx` | ☐ | `src/routes/settings/index.tsx` |
| 17 | `src/app/settings/profile/page.tsx` | ☐ | `src/routes/settings/profile.tsx` |
| 18 | `src/app/settings/account/page.tsx` | ☐ | `src/routes/settings/account.tsx` |
| 19 | `src/app/settings/billing/page.tsx` | ☐ | `src/routes/settings/billing.tsx` |
| 20 | `src/app/settings/api-keys/page.tsx` | ☐ | `src/routes/settings/api-keys.tsx` |
| 21 | `src/app/settings/feedback/page.tsx` | ☐ | `src/routes/settings/feedback.tsx` |
| 22 | `src/app/settings/notifications/page.tsx` | ☐ | `src/routes/settings/notifications.tsx` |

### 8.4.2. Semua File Layout/Loading/Error

| File Next.js | File TanStack Start | Status |
|---|---|---|
| `src/app/layout.tsx` | `src/routes/__root.tsx` | ☐ |
| `src/app/providers.tsx` | include di `__root.tsx` | ☐ |
| `src/app/loading.tsx` | TanStack Start pending state | ☐ |
| `src/app/error.tsx` | TanStack Start error boundary | ☐ |
| `src/app/not-found.tsx` | TanStack Start notFound route | ☐ |

### 8.4.3. Semua Komponen — 62 file UI

| Folder | Jumlah File | Status Pindah |
|---|---|---|
| `src/components/ac/` | 2 | ☐ |
| `src/components/auth/` | 5 | ☐ (sebagian ganti Better Auth) |
| `src/components/chat/` | 6 | ☐ |
| `src/components/kanban/` | 5 | ☐ |
| `src/components/layout/` | 10 | ☐ |
| `src/components/prd/` | 9 | ☐ |
| `src/components/settings/` | 6 | ☐ |
| `src/components/task/` | 9 | ☐ |
| `src/components/ui/` | 10 | ☐ |

**62 komponen harus dipastikan 100% COPAS (copy-paste) ke project baru.** Komponen ini pure React/Typescript — gak tergantung framework. Tapi DIUJI SATU PERSATU setelah dipindah.

### 8.4.4. Semua Service Functions

| File | Status | Catatan |
|---|---|---|
| `src/lib/services/prd-service.ts` | ☐ | Ganti query ke Drizzle, port ke `src/lib/server/prd.ts` |
| `src/lib/services/ac-service.ts` | ☐ | Ganti query ke Drizzle, port ke `src/lib/server/ac.ts` |
| `src/lib/services/chat-service.ts` | ☐ | Ganti query ke Drizzle |
| `src/lib/services/task-service.ts` | ☐ | Ganti query ke Drizzle |
| `src/lib/services/sitemap-service.ts` | ☐ | Ganti query ke Drizzle |
| `src/lib/services/export-service.ts` | ☐ | Ganti query ke Drizzle |
| `src/lib/services/error-sanitizer.ts` | ☐ | Pure function — COPAS saja |
| `src/lib/services/db-retry.ts` | ☐ | HAPUS — Drizzle gak perlu |
| `src/lib/services/ai-orchestrator.ts` | ☐ | HAPUS — ganti Vercel AI SDK |

### 8.4.5. Root Configuration Files

| File | Status | Keterangan |
|---|---|---|
| `package.json` | ☐ | BARU (TanStack Start) |
| `tsconfig.json` | ☐ | BARU |
| `.env.local` | ☐ | Pindahkan env tapi HAPUS secret InsForge |
| `.env.example` | ☐ | Update dengan env baru |
| `postcss.config.mjs` | ☐ | TanStack Start pake PostCSS (Tailwind Vite) |
| `vitest.config.ts` + `vitest.setup.ts` | ☐ | COPAS |
| `eslint.config.mjs` | ☐ | HAPUS — ganti Biome |
| `playwright.config.ts` | ☐ | COPAS |
| `vercel.json` | ☐ | HAPUS — gak deploy ke Vercel |
| `instrumentation.ts` | ☐ | Evaluasi apakah masih dibutuhkan |
| `sentry.client.config.ts` | ☐ | HAPUS kalo gak pake Sentry |
| `sentry.edge.config.ts` | ☐ | HAPUS |
| `sentry.server.config.ts` | ☐ | HAPUS |

### 8.4.6. Public / Static Assets

| Path | Status |
|---|---|
| `public/` (semua file) | ☐ — COPAS ke project baru |

### 8.4.7. Actions (Server Actions)

| File | Status | Catatan |
|---|---|---|
| `src/app/actions/payment.ts` | ☐ | Ganti ke Drizzle + adminDb |
| `src/app/actions/settings.ts` | ☐ | Ganti ke Drizzle + Better Auth |
| `src/app/actions/prd.ts` | ☐ | Ganti ke Drizzle |
| `src/app/actions/notifications.ts` | ☐ | Ganti ke Drizzle |

### 8.4.8. Semua API Routes — 38 Route Files

| Path Next.js | Path TanStack Start | Status |
|---|---|---|
| `src/app/api/ac/generate/route.ts` | `src/routes/api/ac/generate.ts` | ☐ |
| `src/app/api/ac/revise/route.ts` | `src/routes/api/ac/revise.ts` | ☐ |
| `src/app/api/ac/save/route.ts` | `src/routes/api/ac/save.ts` | ☐ |
| `src/app/api/chat/route.ts` | `src/routes/api/chat.ts` | ☐ |
| `src/app/api/export/prd/route.ts` | `src/routes/api/export/prd.ts` | ☐ |
| `src/app/api/export/zip/route.ts` | `src/routes/api/export/zip.ts` | ☐ |
| `src/app/api/feedback/route.ts` | `src/routes/api/feedback.ts` | ☐ |
| `src/app/api/kanban/[pid]/route.ts` | `src/routes/api/kanban/$pid.ts` | ☐ |
| `src/app/api/kanban/update-status/route.ts` | `src/routes/api/kanban/update-status.ts` | ☐ |
| `src/app/api/payments/create/route.ts` | `src/routes/api/payments/create.ts` | ☐ |
| `src/app/api/payments/webhook/route.ts` | `src/routes/api/payments/webhook.ts` | ☐ |
| `src/app/api/projects/route.ts` | `src/routes/api/projects.ts` | ☐ |
| `src/app/api/projects/[id]/route.ts` | `src/routes/api/projects/$id.ts` | ☐ |
| `src/app/api/projects/[id]/step/route.ts` | `src/routes/api/projects/$id/step.ts` | ☐ |
| `src/app/api/report-error/route.ts` | `src/routes/api/report-error.ts` | ☐ |
| `src/app/api/settings/api-keys/route.ts` | `src/routes/api/settings/api-keys.ts` | ☐ |
| `src/app/api/settings/api-keys/[id]/route.ts` | `src/routes/api/settings/api-keys/$id.ts` | ☐ |
| `src/app/api/sitemap/[projectId]/route.ts` | `src/routes/api/sitemap/$projectId.ts` | ☐ |
| `src/app/api/sitemap/generate/route.ts` | `src/routes/api/sitemap/generate.ts` | ☐ |
| `src/app/api/task/[projectId]/route.ts` | `src/routes/api/task/$projectId.ts` | ☐ |
| `src/app/api/task/generate/route.ts` | `src/routes/api/task/generate.ts` | ☐ |
| `src/app/api/user/plan/route.ts` | `src/routes/api/user/plan.ts` | ☐ |
| `src/app/api/v1/projects/[id]/route.ts` | `src/routes/api/v1/projects/$id.ts` | ☐ |
| `src/app/api/v1/projects/[id]/kanban/route.ts` | `src/routes/api/v1/projects/$id/kanban.ts` | ☐ |
| `src/app/api/v1/projects/[id]/tasks/route.ts` | `src/routes/api/v1/projects/$id/tasks.ts` | ☐ |
| `src/app/api/v1/tasks/[id]/status/route.ts` | `src/routes/api/v1/tasks/$id/status.ts` | ☐ |
| `src/app/api/v1/subtasks/[id]/status/route.ts` | `src/routes/api/v1/subtasks/$id/status.ts` | ☐ |
| `src/app/api/auth/me/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/sign-in/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/sign-up/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/sign-out/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/refresh/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/onboarding/route.ts` | HAPUS — ganti Drizzle | ☐ |
| `src/app/api/auth/oauth/google/route.ts` | HAPUS — Better Auth handle | ☐ |
| `src/app/api/auth/oauth/callback/route.ts` | HAPUS — Better Auth handle | ☐ |

### 8.4.9. Semua Lib Files

| File Next.js | Status TanStack Start | Catatan |
|---|---|---|
| `src/lib/ai-client.ts` | ☐ HAPUS | Ganti Vercel AI SDK |
| `src/lib/api-key-auth.ts` | ☐ COPAS + ganti DB | Pure function + query |
| `src/lib/auth.ts` | ☐ GANTI ISI | Better Auth server instance |
| `src/lib/constants.ts` | ☐ COPAS | Pure constant |
| `src/lib/kanban-utils.ts` | ☐ COPAS | Pure function |
| `src/lib/model-config.ts` | ☐ COPAS | Config mapping |
| `src/lib/pricing-data.ts` | ☐ COPAS | Pure data |
| `src/lib/prompt-handoff.ts` | ☐ COPAS | localStorage logic |
| `src/lib/prompts.ts` | ☐ COPAS | Prompt string |
| `src/lib/prompts-ac.ts` | ☐ COPAS | Prompt string |
| `src/lib/prompts-sitemap.ts` | ☐ COPAS | Prompt string |
| `src/lib/prompts-task.ts` | ☐ COPAS | Prompt string |
| `src/lib/quota.ts` | ☐ Ganti DB | Query ke Drizzle |
| `src/lib/rate-limit.ts` | ☐ HAPUS | Ganti Better Auth |
| `src/lib/utils.ts` | ☐ COPAS | Pure function |
| `src/lib/insforge/*` (5 file) | ☐ HAPUS SEMUA | Ganti Drizzle + Better Auth |

### 8.4.10. Store & Hooks

| Folder | Jumlah File | Status |
|---|---|---|
| `src/store/` | 1 (`index.ts`) | ☐ COPAS |
| `src/hooks/` | 3 (`use-canvas-zoom`, `use-kanban-polling`, `use-panel-resize`) | ☐ COPAS |

### 8.4.11. Middleware

| File | Status |
|---|---|
| `src/middleware.ts` | ☐ HAPUS — ganti TanStack Start loader auth check |

### 8.4.12. TypeScript Types

| File | Status |
|---|---|
| `src/types/database.ts` | ☐ GANTI — Drizzle schema jadi source of truth |

### 8.4.13. AI Streaming (7 file)

| File | Baris | Status |
|---|---|---|
| `src/lib/ai-client.ts` | ~40 | ☐ HAPUS |
| `src/lib/services/ai-orchestrator.ts` | 70 | ☐ HAPUS |
| `src/app/api/chat/route.ts` | 422 | ☐ Migrasi |
| `src/app/api/ac/generate/route.ts` | 198 | ☐ Migrasi |
| `src/app/api/ac/revise/route.ts` | ~150 | ☐ Migrasi |
| `src/components/chat/chat-panel.tsx` | (UI) | ☐ Client SDK |
| `src/components/ac/ac-detail.tsx` | (UI) | ☐ Client SDK |

---

### 8.5. Cara Penggunaan Checklist

1. **Copy checklist** di file ini ke issue tracker / task board
2. **Tandai ☐ → ☑** setiap kali selesai
3. **Sehabis migrasi satu halaman/route:** test dulu di browser
4. **Jangan pencet ☑ kalo belum nyoba**
5. **Final verify:** jalanin semua flow utama dari Home → Generate PRD → Generate AC → Task → Kanban
6. **Ulang dari awal kalo ada yang beda** antara Next.js lama vs TanStack Start baru

### 8.6. Rollback Plan

Kalo migrasi gagal di tengah jalan:
- Project NEXT JS LAMA tetap utuh di `C:\Coding\Web Development\Next\novaplan_ai`
- Aplikasi masih jalan pake `cd ../novaplan_ai && npm run dev`
- Gak ada yang kedel navigasi — project baru di folder terpisah

---

*Dokumen ini akan diupdate seiring progres migrasi. Setiap fase ditandai selesai setelah testing pass.*
