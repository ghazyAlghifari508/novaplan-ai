## Mandatory Coding Rules

* UTAMAKAN melakukan analisis codebase secara MENYELURUH sebelum menulis kode apapun. Jangan membuat asumsi, jangan menebak implementasi, dan jangan langsung coding tanpa memahami konteks sistem secara penuh.
* Lakukan pengecekan codebase secara MANUAL dengan membaca file-file yang relevan satu per satu, DAN lakukan validasi tambahan menggunakan GRAPHIFY untuk memahami relasi, dependency, flow data, dan struktur arsitektur project.
* UTAMAKAN PROSES BERPIKIR sebelum implementasi. Pahami terlebih dahulu:

  * alur data end-to-end,
  * struktur folder dan arsitektur,
  * dependency antar file/module,
  * state management,
  * API flow,
  * reusable components,
  * serta dampak perubahan terhadap sistem secara keseluruhan.
* Jangan melakukan perubahan yang bersifat destruktif, breaking change, atau refactor besar tanpa alasan yang jelas dan analisis yang matang.
* Jangan membuat file, function, component, atau abstraction baru jika sebenarnya masih bisa memanfaatkan struktur yang sudah ada di codebase.
* Hindari duplicate logic dan pastikan konsistensi style, pattern, naming, dan architecture mengikuti codebase yang sudah ada.
* Sebelum menulis kode, jelaskan terlebih dahulu analisis, akar masalah, file yang terdampak, serta rencana implementasi secara terstruktur.
* Jangan melakukan commit, push, merge, publish, ataupun redeploy dalam bentuk apapun tanpa instruksi eksplisit dari user.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## skill: vercel-react-best-practices

Gunakan skill ini saat menulis komponen React, konfigurasi Next.js, atau deploy ke Vercel.

Rules:
- **Environment Variables**: Jangan hardcode API keys. Gunakan `process.env` untuk server-side dan prefix `NEXT_PUBLIC_` hanya untuk variabel yang memang harus diakses client.
- **Server vs Client**: Pisahkan logika server (`"use server"`) dan client (`"use client"`) dengan tegas. Jangan import server-only modules di client components.
## Mandatory Coding Rules

* UTAMAKAN melakukan analisis codebase secara MENYELURUH sebelum menulis kode apapun. Jangan membuat asumsi, jangan menebak implementasi, dan jangan langsung coding tanpa memahami konteks sistem secara penuh.
* Lakukan pengecekan codebase secara MANUAL dengan membaca file-file yang relevan satu per satu, DAN lakukan validasi tambahan menggunakan GRAPHIFY untuk memahami relasi, dependency, flow data, dan struktur arsitektur project.
* UTAMAKAN PROSES BERPIKIR sebelum implementasi. Pahami terlebih dahulu:

  * alur data end-to-end,
  * struktur folder dan arsitektur,
  * dependency antar file/module,
  * state management,
  * API flow,
  * reusable components,
  * serta dampak perubahan terhadap sistem secara keseluruhan.
* Jangan melakukan perubahan yang bersifat destruktif, breaking change, atau refactor besar tanpa alasan yang jelas dan analisis yang matang.
* Jangan membuat file, function, component, atau abstraction baru jika sebenarnya masih bisa memanfaatkan struktur yang sudah ada di codebase.
* Hindari duplicate logic dan pastikan konsistensi style, pattern, naming, dan architecture mengikuti codebase yang sudah ada.
* Sebelum menulis kode, jelaskan terlebih dahulu analisis, akar masalah, file yang terdampak, serta rencana implementasi secara terstruktur.
* Jangan melakukan commit, push, merge, publish, ataupun redeploy dalam bentuk apapun tanpa instruksi eksplisit dari user.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## skill: vercel-react-best-practices

Gunakan skill ini saat menulis komponen React, konfigurasi Next.js, atau deploy ke Vercel.

Rules:
- **Environment Variables**: Jangan hardcode API keys. Gunakan `process.env` untuk server-side dan prefix `NEXT_PUBLIC_` hanya untuk variabel yang memang harus diakses client.
- **Server vs Client**: Pisahkan logika server (`"use server"`) dan client (`"use client"`) dengan tegas. Jangan import server-only modules di client components.
- **Data Fetching**: Gunakan Server Components untuk data fetching. Gunakan `React.cache()` untuk deduplikasi request dalam satu render pass. Panggil `revalidatePath()` atau `revalidateTag()` setelah mutasi data.
- **Routing**: Gunakan App Router conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). Jangan buat routing custom yang bertentangan dengan Next.js conventions.
- **Performance**: Gunakan `Suspense` boundary untuk loading states. Lazy-load komponen berat dengan `dynamic()`. Optimalkan gambar dengan `next/image`.
- **Build & Deploy**: Selalu pastikan `next build` berhasil tanpa error sebelum deploy. Gunakan `--no-lint` hanya untuk quick check, pastikan lint juga bersih.
- **Error Handling**: Sediakan `error.tsx` di setiap route segment yang kritis. Gunakan `try/catch` di Server Actions dan kembalikan error yang informatif.

## TAMBAHAN ATURAN
- JANGAN PERNAH modify code yang tidak diminta
- SETIAP MENJAWAB PERTANYAAN GW, GABOLEH NGASAL DAN HALUSINASI SERTA GABOLEH BERASUMSI LIAR!!! UTAMAKAN BERPIKIR!! SEPERTI MEMBACA CODE BASE PROJEK INI, MEMBACA FLOW DAN LOGIC DAN FUNCTION YANG TERSEDIA!, MEMBACA DOKUMENTASI GITHUB MAUPUN CONTEXT7!
- PAKAI SKILL CYBERSECURITY JIKA DIMINTA

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **novaplanai** (API base `https://4ew2z6h5.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
