## Mandatory Coding Rules

- UTAMAKAN melakukan analisis codebase secara MENYELURUH sebelum menulis kode apapun. Jangan membuat asumsi, jangan menebak implementasi, dan jangan langsung coding tanpa memahami konteks sistem secara penuh.
- Lakukan pengecekan codebase secara MANUAL dengan membaca file-file yang relevan satu per satu, DAN lakukan validasi tambahan menggunakan GRAPHIFY untuk memahami relasi, dependency, flow data, dan struktur arsitektur project.
- UTAMAKAN PROSES BERPIKIR sebelum implementasi. Pahami terlebih dahulu:
  - alur data end-to-end,
  - struktur folder dan arsitektur,
  - dependency antar file/module,
  - state management,
  - API flow,
  - reusable components,
  - serta dampak perubahan terhadap sistem secara keseluruhan.

- Jangan melakukan perubahan yang bersifat destruktif, breaking change, atau refactor besar tanpa alasan yang jelas dan analisis yang matang.
- Jangan membuat file, function, component, atau abstraction baru jika sebenarnya masih bisa memanfaatkan struktur yang sudah ada di codebase.
- Hindari duplicate logic dan pastikan konsistensi style, pattern, naming, dan architecture mengikuti codebase yang sudah ada.
- Sebelum menulis kode, jelaskan terlebih dahulu analisis, akar masalah, file yang terdampak, serta rencana implementasi secara terstruktur.
- Jangan melakukan commit, push, merge, publish, ataupun redeploy dalam bentuk apapun tanpa instruksi eksplisit dari user.

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

## WAJIB: Skill Caveman & Ponytail (selalu aktif)

Dua skill ini WAJIB selalu aktif di SETIAP respons, tanpa terkecuali, kecuali user secara eksplisit memintamu menonaktifkannya (misalnya menulis "stop caveman", "normal mode", atau "stop ponytail").

### Caveman — gaya komunikasi terse

Caveman mengatur CARA kamu berbicara, bukan kode yang kamu tulis. Tujuannya menghemat token dan membuat jawaban langsung ke inti.

- Selalu tulis penjelasan dalam gaya ringkas: buang kata sambung yang tidak perlu (a/an/the dalam bahasa Inggris), buang filler ("just", "really", "basically", "actually", "simply"), buang basa-basi ("sure", "of course", "happy to help"), dan buang hedging yang tidak menambah informasi.
- Boleh memakai kalimat fragmen. Pilih sinonim yang lebih pendek (big bukan extensive, fix bukan "implement a solution for"). Tapi istilah teknis tetap presisi dan tidak boleh diubah.
- Pola yang dianjurkan: `[hal] [aksi] [alasan]. [langkah berikutnya].`
- PENGECUALIAN PENTING — tulis NORMAL (tidak terse) untuk: kode, pesan commit, deskripsi PR, peringatan keamanan, konfirmasi aksi yang tidak bisa di-undo, dan langkah multi-step di mana urutan fragmen bisa salah dibaca. Setelah bagian itu selesai, kembali ke gaya caveman.
- Substansi teknis TIDAK BOLEH hilang. Yang dibuang hanya fluff, bukan informasi. Pesan error tetap dikutip persis apa adanya.

### Ponytail — disiplin engineering yang malas (efisien)

Ponytail mengatur APA yang kamu bangun, bukan cara kamu bicara. Prinsipnya: kode terbaik adalah kode yang tidak perlu ditulis. Malas di sini berarti efisien, bukan ceroboh.

- Sebelum menulis kode, naiki "tangga" ini dan berhenti di anak tangga pertama yang berhasil:
  1. Apakah ini benar-benar perlu ada? Kebutuhan spekulatif = lewati, sebut alasannya satu baris (YAGNI).
  2. Apakah sudah ada di codebase ini? Helper, util, type, atau pattern yang sudah ada → pakai ulang. Cari dulu sebelum menulis.
  3. Apakah stdlib atau fitur native platform sudah menyelesaikannya? Pakai itu (mis. `<input type="date">` daripada library picker, CSS daripada JS).
  4. Apakah dependency yang SUDAH terpasang menyelesaikannya? Pakai. Jangan tambah dependency baru untuk sesuatu yang bisa diselesaikan beberapa baris kode.
  5. Bisakah jadi satu baris? Buat satu baris.
  6. Baru kemudian: kode minimum yang berfungsi.
- Tangga ini dijalankan SETELAH memahami masalah, bukan menggantikan pemahaman. Baca task dan kode yang terdampak dulu, telusuri flow end-to-end, baru naiki tangga.
- Bug fix = perbaiki AKAR MASALAH, bukan gejala. Sebelum edit, grep semua pemanggil fungsi yang akan kamu ubah. Perbaiki sekali di tempat semua pemanggil lewat, bukan tambal di tiap pemanggil.
- Larangan: tidak ada abstraksi yang tidak diminta (tidak ada interface dengan satu implementasi, tidak ada factory untuk satu produk, tidak ada config untuk nilai yang tidak pernah berubah), tidak ada boilerplate/scaffolding "buat nanti".
- Utamakan penghapusan daripada penambahan. Pilih yang membosankan daripada yang pintar. Diff terpendek yang berfungsi menang — tapi hanya setelah masalah dipahami.
- Tandai penyederhanaan yang disengaja dengan komentar `// ponytail: ...` agar terbaca sebagai niat, bukan ketidaktahuan. Untuk shortcut dengan batas yang diketahui, sebut batas itu dan jalur upgrade-nya.
- JANGAN pernah malas soal: validasi input di batas trust, error handling yang mencegah kehilangan data, keamanan, aksesibilitas dasar, dan apa pun yang diminta eksplisit oleh user.
- Output: kode dulu, lalu maksimal tiga baris pendek (apa yang dilewati, kapan perlu ditambah). Kalau penjelasan lebih panjang dari kodenya, hapus penjelasannya.

## Plugin ECC — pakai agent/skill sesuai kebutuhan

Plugin ECC menyediakan banyak agent spesialis dan skill. Gunakan yang RELEVAN dengan task secara proaktif, jangan paksakan satu agent untuk semua hal. Pilih berdasarkan bahasa/framework dan jenis pekerjaan. Untuk project ini (Next.js + React + TypeScript), yang paling sering relevan adalah agent React/TypeScript dan skill frontend/Next.js.

Cara invoke: gunakan tool `Agent` dengan `subagent_type` = nama agent (mis. `ecc:react-reviewer`), atau tool `Skill` dengan nama skill (mis. `ecc:react-patterns`).

### Agent review (pakai SETELAH menulis/mengubah kode)

- `ecc:react-reviewer` — review file `.tsx`/`.jsx` dan logika komponen React. Cek kebenaran hook, performa render, batas server/client component, aksesibilitas, dan keamanan khas React. WAJIB untuk setiap perubahan React di project ini.
- `ecc:typescript-reviewer` — review TypeScript/JavaScript. Fokus type safety, kebenaran async, keamanan Node/web, dan pola idiomatik. Pakai untuk perubahan `.ts` non-React.
- `ecc:code-reviewer` — review umum kualitas, keamanan, maintainability. Pakai segera setelah menulis/mengubah kode yang tidak punya reviewer bahasa spesifik.
- `ecc:security-reviewer` — deteksi kerentanan keamanan (secrets bocor, SSRF, injection, crypto tidak aman, OWASP Top 10). Pakai setelah menulis kode yang menangani input user, autentikasi, endpoint API, atau data sensitif.
- `ecc:database-reviewer` — spesialis PostgreSQL: optimasi query, desain schema, keamanan, performa. Pakai saat menulis SQL, membuat migrasi, atau mendesain schema (relevan karena project pakai InsForge/Postgres).
- `ecc:silent-failure-hunter` — cari silent failure, error yang ditelan, fallback buruk, error propagation yang hilang.
- `ecc:comment-analyzer` — analisis akurasi dan risiko "comment rot" pada komentar kode.
- `ecc:type-design-analyzer` — analisis desain type: enkapsulasi, ekspresi invariant, penegakan.

### Agent build/error fixing (pakai SAAT build gagal)

- `ecc:react-build-resolver` — perbaiki kegagalan build React (Vite, webpack, Next.js, dll): error JSX/TSX, hydration mismatch, batas server/client component yang gagal, type hilang. WAJIB saat build React gagal.
- `ecc:build-error-resolver` — resolusi error build dan TypeScript umum dengan diff minimal, tanpa edit arsitektur. Pakai untuk membuat build hijau cepat.

### Agent planning & arsitektur (pakai SEBELUM implementasi besar)

- `ecc:planner` — perencanaan untuk fitur kompleks dan refactoring. Pakai saat user minta implementasi fitur, perubahan arsitektur, atau refactor kompleks.
- `ecc:architect` — desain sistem, skalabilitas, keputusan teknis. Pakai saat merencanakan fitur baru atau refactor sistem besar.
- `ecc:code-architect` — desain arsitektur fitur dengan menganalisis pola codebase yang ada, lalu memberi blueprint implementasi (file, interface, data flow, urutan build).
- `ecc:code-explorer` — analisis mendalam fitur yang sudah ada dengan menelusuri jalur eksekusi dan memetakan layer arsitektur. Pakai untuk memahami kode sebelum menambah fitur.

### Agent kualitas & maintenance

- `ecc:code-simplifier` — sederhanakan kode untuk kejelasan dan konsistensi tanpa mengubah perilaku. Fokus pada kode yang baru diubah.
- `ecc:refactor-cleaner` — hapus dead code, duplikat, dan refactor. Menjalankan knip/depcheck/ts-prune untuk menemukan dan menghapus kode mati dengan aman.
- `ecc:performance-optimizer` — analisis dan optimasi performa: bottleneck, bundle size, runtime, memory leak, optimasi render.
- `ecc:a11y-architect` — aksesibilitas, kepatuhan WCAG 2.2. Pakai proaktif saat mendesain komponen UI atau audit aksesibilitas.
- `ecc:doc-updater` — update codemap dan dokumentasi (README, guide).
- `ecc:e2e-runner` — testing end-to-end (Vercel Agent Browser / Playwright). Pakai untuk generate, maintain, dan menjalankan E2E test alur kritis.
- `ecc:tdd-guide` — TDD, tulis test dulu. Pakai saat menulis fitur baru, fix bug, atau refactor.
- `ecc:docs-lookup` — ambil dokumentasi terkini library/framework via Context7. Pakai untuk pertanyaan docs/API/setup.

### Skill ECC yang relevan untuk project ini

- `ecc:react-patterns`, `ecc:react-performance`, `ecc:react-testing` — pola, performa, dan testing React.
- `ecc:nextjs-turbopack`, `ecc:frontend-patterns`, `ecc:frontend-a11y` — pola Next.js dan frontend.
- `ecc:design-system`, `ecc:make-interfaces-feel-better`, `ecc:liquid-glass-design` — desain UI/UX dan design system.
- `ecc:postgres-patterns`, `ecc:database-migrations` — pola Postgres dan migrasi (relevan dengan InsForge).
- `ecc:git-workflow`, `ecc:github-ops` — alur kerja git dan operasi GitHub.
- `ecc:security-review`, `ecc:security-scan` — review dan scan keamanan.
- `ecc:code-review`, `ecc:test-coverage`, `ecc:quality-gate` — review kode, cakupan test, gerbang kualitas.
- `ecc:deployment-patterns`, `ecc:docker-patterns` — pola deploy dan Docker.

Catatan: daftar di atas adalah yang paling sering relevan, BUKAN daftar lengkap. ECC punya banyak agent/skill lain untuk bahasa dan domain lain (Go, Rust, Python, Java, Flutter, dll). Kalau task menyentuh domain itu, pilih agent/skill ECC yang sesuai bahasanya. Prinsipnya: cocokkan agent dengan jenis pekerjaan dan stack-nya, dan jangan menebak API library — pakai agent atau skill yang tepat.
