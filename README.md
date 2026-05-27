# NovaPlan AI — Product Requirements Document (PRD) & Developer Guide

## 1. Pendahuluan
**NovaPlan AI** adalah platform *Software as a Service* (SaaS) mutakhir yang dirancang untuk membantu Product Manager, Developer, dan Entrepreneur dalam membuat *Product Requirements Document* (PRD) berstandar industri dalam hitungan menit. Memanfaatkan teknologi AI *generative* termutakhir melalui integrasi OpenRouter, NovaPlan mengotomatisasi proses penyusunan spesifikasi teknis dan bisnis yang biasanya memakan waktu berhari-hari.

## 2. Arsitektur Teknis & Stack
Aplikasi ini dikembangkan dengan pendekatan arsitektur modern berbasis komponen dan fungsi-fungsi *serverless* untuk menjamin skalabilitas, kecepatan, dan pengalaman pengguna yang optimal.

*   **Framework Utama**: Next.js 15 (App Router) dengan React 19.
*   **Bahasa Pemrograman**: TypeScript (v5).
*   **Desain Antarmuka**: Tailwind CSS v4 untuk penataan gaya yang *utility-first*, dipadukan dengan pustaka komponen UI modern (21st.dev & komponen kustom). Animasi interaktif dikelola menggunakan Framer Motion (v11).
*   **Manajemen State & Data Fetching**: Zustand v5 (klien) dan TanStack Query v5 (pengelolaan *caching* dan siklus hidup data asinkron).
*   **Backend & API**: Next.js API Routes (Serverless Functions) dan Server Actions untuk mutasi data yang aman.
*   **Autentikasi & Database**: Supabase (PostgreSQL) menangani basis data relasional lengkap dengan *Row Level Security* (RLS) serta sistem autentikasi (Email/Password & Google OAuth 2.0).
*   **Penyimpanan Media**: Supabase Storage untuk pengelolaan aset pengguna.
*   **Mesin Kecerdasan Buatan (AI)**: OpenRouter API (menjalankan model termutakhir seperti Gemini Flash, Llama, dan Mistral).
*   **Sistem Pembayaran**: Integrasi Midtrans Sandbox (SNAP) untuk *gateway* pembayaran berlangganan/kuota.
*   **Infrastruktur & Deployment**: Vercel.

## 3. Topologi & Skema Basis Data
Infrastruktur data menggunakan PostgreSQL via Supabase dengan 9 entitas utama yang saling berelasi:
1.  **`users`**: Profil dan preferensi akun pengguna.
2.  **`subscriptions`**: Data paket berlangganan pengguna (Pro/Basic).
3.  **`quotas`**: Pelacakan batas penggunaan AI (*rate-limiting* tingkat entitas).
4.  **`projects`**: Wadah utama kolaborasi dan manajemen PRD.
5.  **`prd_versions`**: Pencatatan riwayat revisi PRD (sistem *versioning*).
6.  **`conversations`**: Sesi obrolan pengguna dengan asisten AI.
7.  **`messages`**: Rincian log interaksi dan hasil *generate* di dalam `conversations`.
8.  **`payments`**: Transaksi keuangan dan riwayat faktur Midtrans.
9.  **`rate_limits`**: Pengelolaan keamanan *endpoint* publik dari potensi penyalahgunaan.

*(Catatan Keamanan: Semua tabel di atas dilindungi dengan kebijakan Row Level Security / RLS secara ketat).*

## 4. Struktur Direktori Proyek
```text
novaplan_ai/
├── src/
│   ├── app/                # Root aplikasi (App Router, middleware, API)
│   ├── components/         
│   │   ├── ui/             # Komponen visual dasar (Button, Card, Input)
│   │   ├── auth/           # Formulir autentikasi & Onboarding
│   │   ├── chat/           # Mesin interaksi AI (Chat panel, bubble, selector)
│   │   ├── prd/            # Penampil dan pengelola dokumen PRD
│   │   └── settings/       # Tampilan pengaturan akun & preferensi
│   ├── lib/                # Konfigurasi eksternal (Supabase, OpenRouter)
│   ├── store/              # State management global (Zustand)
│   ├── types/              # Deklarasi tipe statis (TypeScript)
│   └── hooks/              # Custom React Hooks
├── migrations/             # Skrip migrasi SQL (struktur dan *trigger*)
└── middleware.ts           # Interseptor rute (verifikasi sesi, proteksi area aman)
```

## 5. Prasyarat & Panduan Instalasi Lokal
Untuk menjalankan proyek ini di lingkungan pengembangan (*development*), pastikan mesin Anda memenuhi kriteria berikut:
*   **Node.js**: Versi 18.17 atau yang lebih baru.
*   **NPM / Yarn / Pnpm**: Package manager.

**Langkah Instalasi:**
1. Kloning repositori dan instal dependensi:
   ```bash
   npm install
   ```
2. Salin *template* *environment variables*:
   ```bash
   cp .env.example .env.local
   ```
3. Konfigurasikan variabel wajib (berdasarkan kredensial Supabase, OpenRouter, dan Midtrans Anda).
4. Jalankan *development server*:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui `http://localhost:3000`.

## 6. Integrasi Agent & Ekosistem AI
Aplikasi ini dikembangkan dan dirancang agar selalu selaras dengan ekosistem AI Coding Assistant (*Agentic Coding*). *Skill* atau modul referensi yang direkomendasikan untuk pengembangan lanjutan meliputi:
- `vercel-react-best-practices`
- `supabase-postgres-best-practices`

## 7. Status Pengiriman Produk (Roadmap)
Pengembangan proyek dibagi menjadi 10 fase terstruktur:
*   **Fase 0 — Foundation & Setup**: ✅ Selesai
*   **Fase 1 — Auth & User System**: ✅ Selesai
*   **Fase 2 — Hero Page & Landing**: ✅ Selesai
*   **Fase 3 — AI Chat Engine**: ✅ Selesai
*   **Fase 4 — PRD Viewer & Editor**: ✅ Selesai
*   **Fase 5 — Dashboard**: ✅ Selesai
*   **Fase 6 — Pricing & Payment**: ⏳ *Dalam Pengerjaan*
*   **Fase 7 — Pengaturan & Kustomisasi Profil**: ✅ Selesai
*   **Fase 8 — QA & Pengujian Sistem**: ⏳ *Dalam Pengerjaan*
*   **Fase 9 — Rilis Publik (Launch)**: ⏳ *Tertunda*
*   **Fase 10 — Konfigurasi Graphify**: ⏳ *Tertunda*

---
*Dokumentasi ini dikelola secara dinamis. Harap perbarui seiring dengan iterasi versi rilis perangkat lunak.*