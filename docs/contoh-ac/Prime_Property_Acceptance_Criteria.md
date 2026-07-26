# PRIME PROPERTY

## ACCEPTANCE CRITERIA

Web Platform & Internal Agent Portal

Landing Page · About Us · Contact Us

Property Listing Management dengan Role-Based Access

### RUANG LINGKUP DOKUMEN

Branding & Design System · Halaman Publik (Landing, About, Contact) · Autentikasi Internal Agent · Role Admin & Superadmin · Schema Data Properti · CRUD Listing · Filter & Pencarian · Non-Functional Requirements

| | |
|---|---|
| VERSI | 1.0 · Final Draft |
| BAHASA | Indonesia |
| TANGGAL | 24 Mei 2026 |

## 1. Branding & Design System

### AC-1.1 Color Palette

Sistem WAJIB menggunakan palette warna yang konsisten dengan logo Prime Property:

| | |
|---|---|
| Primary Black | #1A1A1A · Header, teks utama |
| Accent Gold | #C9A961 · CTA, highlight, badge |
| Accent Red | #B33A3A · Status urgent, hover |
| Neutral White | #FFFFFF · Background utama |
| Soft Gray | #F5F5F5 · Card, background sekunder |

Logo Prime Property WAJIB tampil di header semua halaman publik dan dashboard internal.

Typography: sans-serif modern (Inter atau Geist). Bold untuk heading, regular untuk body.

### AC-1.2 Layout Principles

Desain WAJIB compact, clear, dan mobile-responsive.

Breakpoint: mobile ≤640px, tablet ≤1024px, desktop ≥1024px.

Spacing konsisten mengikuti grid 4 / 8 / 16 / 24 / 32 px.

TIDAK ada fitur upload gambar untuk listing properti — fokus pada data tabular yang ringkas dan informatif.

## 2. Landing Page (Halaman Publik)

### AC-2.1 Hero Section

Menampilkan tagline Prime Property + 1 CTA primer (contoh: "Lihat Properti" atau "Hubungi Kami").

Background hitam (#1A1A1A) dengan aksen emas, logo terlihat menonjol.

Tombol CTA menggunakan warna emas (#C9A961) dengan teks hitam.

### AC-2.2 Section Konten

Properti Unggulan: menampilkan maksimum 6 properti highlight (read-only, tanpa filter).

Mengapa Prime Property: 3–4 value proposition dengan ikon dan deskripsi singkat.

Footer: logo, kontak singkat (telp/WA/email), link ke About Us & Contact Us.

### AC-2.3 Navigasi Header

Header sticky di seluruh halaman publik.

Urutan menu (kiri ke kanan): Logo | Beranda | Tentang Kami | Kontak | tombol "Login Agent" (di kanan, style outline emas).

## 3. Halaman About Us

### AC-3.1 Konten & Layout

Menampilkan profil Prime Property, visi & misi, dan nilai perusahaan dalam Bahasa Indonesia.

Layout 2 kolom di desktop (teks + visual/quote), single column di mobile.

TIDAK ada elemen interaktif kompleks selain navigasi standar.

## 4. Halaman Contact Us

### AC-4.1 Informasi Kontak

Menampilkan: alamat kantor, nomor telepon, email, dan link WhatsApp (wa.me/...).

Embed Google Maps lokasi kantor (opsional, jika koordinat tersedia).

### AC-4.2 Form Kontak

Field: Nama, Email, Nomor HP, Pesan.

Submit mengirim email notifikasi ke admin Prime Property.

Validasi: semua field wajib diisi, email harus format valid, nomor HP minimum 10 digit.

Setelah submit sukses: tampilkan toast "Pesan terkirim, tim kami akan menghubungi Anda."

Anti-spam: rate limit 3 submit per IP per jam.

## 5. Autentikasi Agent Internal

### AC-5.1 Halaman Login

Route terpisah di /agent/login, TIDAK ada link dari navigasi publik.

Field: Email + Password (atau Email + OTP 6 digit, sesuai keputusan implementasi).

Tidak ada self-registration — akun dibuat manual oleh superadmin.

Session disimpan di httpOnly cookie, SameSite=Lax, masa berlaku 30 hari.

Setelah 5x gagal login dalam 30 menit, akun di-lockout sementara selama 15 menit.

### AC-5.2 Role & Authorization

Sistem WAJIB memiliki 2 role dengan permission yang jelas:

**👤 Admin**

- ✅ View listing properti
- ✅ Filter & search properti
- ✅ Lihat detail properti
- ❌ Tidak bisa Create
- ❌ Tidak bisa Update
- ❌ Tidak bisa Delete

**👑 Superadmin**

- ✅ Full CRUD properti
- ✅ Create akun admin baru
- ✅ Disable/enable akun admin
- ✅ Reset password admin
- ✅ Akses semua fitur admin
- ✅ Lihat audit log perubahan

Penting: Authorization WAJIB dicek di backend untuk setiap endpoint. Frontend hanya menyembunyikan UI elements, BUKAN satu-satunya gate. Admin yang mencoba akses endpoint mutasi harus menerima response 403 Forbidden.

### AC-5.3 Logout

Tombol logout tersedia di header dashboard internal (dropdown profil).

Logout menghapus session cookie dan redirect ke /agent/login.

## 6. Property Listing — Schema Data

### AC-6.1 Field per Properti

Berdasarkan referensi inventory tracker, setiap listing properti memiliki field berikut:

| Field | Tipe Data | Wajib | Keterangan / Contoh |
|-------|----------|-------|--------------------|
| nama_property | string | ✅ | "Aston Villas", "Banyan Tree (Blok A)" |
| group | string (nullable) | ❌ | "Mentari", "Permai 123", "Project Ville" |
| lebar | decimal (meter) | ✅ | 4.5 ; 6 ; 4.25 |
| panjang | decimal (meter) | ✅ | 21.5 ; 11 ; 17.8 |
| hadap | enum (multi) | ✅ | Utara / Selatan / Timur / Barat (boleh kombinasi) |
| tipe | enum | ✅ | Ruko / Villa |
| tingkat | decimal | ✅ | 1 ; 2 ; 2.5 ; 3.5 |
| price | bigint (rupiah) | ✅ | Disimpan sebagai integer rupiah; ditampilkan "Rp 1.350.000.000" |
| carport | boolean | ✅ | Checkbox (true/false) |
| status | enum | ✅ | in_stock / sold_out |
| siap | enum | ✅ | siap_huni / siap_kosong / siap_huni_renovasi |
| maps_link | string (URL) | ❌ | Link Google Maps lokasi properti |
| kawasan | string (multi-tag) | ✅ | "Krakatau", "Pancing", "Cemara Asri/Kuala" |
| unit | string (nullable) | ❌ | "Ready Siap huni", "Gate siap", "Lapangan", "Rucon" |
| created_at | timestamp | ✅ | Auto-generate saat create |
| updated_at | timestamp | ✅ | Auto-update saat perubahan |
| created_by | FK → User | ✅ | Superadmin yang membuat entry |

Catatan: Semua field harga (price) disimpan sebagai integer rupiah penuh (tidak boleh float) untuk menghindari error pembulatan. Format display menggunakan separator titik (.) sesuai locale Indonesia.

## 7. Dashboard Internal — View Properti (Admin & Superadmin)

### AC-7.1 Tampilan Tabel Listing

Default view: tabel kompak menampilkan semua properti dengan kolom: Nama, Group, Lebar × Panjang, Hadap, Tipe, Tingkat, Harga, Carport, Status, Siap, Kawasan.

Pagination: 25 / 50 / 100 baris per halaman, default 50.

Sort by: nama, harga (asc/desc), tanggal dibuat, status.

Status ditampilkan dengan badge berwarna:

- In Stock → badge hijau muda
- Sold Out → badge merah (#B33A3A)
- Siap Huni → badge kuning/emas
- Siap Kosong → badge ungu muda

Klik baris → buka panel detail di samping (drawer) atau halaman detail terpisah.

### AC-7.2 Filter & Pencarian

User WAJIB dapat menemukan properti dengan cepat melalui filter berikut:

- Kawasan: dropdown multi-select (Krakatau, Pancing, Tembung, Helvetia, dll.)
- Lebar min (m): input numeric
- Hadap: multi-select (Utara, Selatan, Timur, Barat)
- Harga Max: input numeric dengan format rupiah (slider opsional)
- Tipe: radio (Semua / Ruko / Villa)
- Status: radio (Semua / In Stock / Sold Out)
- Siap: multi-select (Siap Huni, Siap Kosong, Siap Huni Renovasi)
- Carport: toggle (Ya / Tidak / Semua)

Search bar: free-text di atas tabel, mencari ke nama_property + group + kawasan.

Filter di-apply real-time dengan debounce 300ms.

Active filter ditampilkan sebagai chip di atas tabel, bisa di-remove individual.

Tombol "Reset Filter" mengembalikan ke state default.

URL query params menyimpan state filter (shareable link).

### AC-7.3 Halaman Detail Properti

Menampilkan seluruh field properti dalam layout 2 kolom yang ringkas.

Link Maps (jika ada) → tombol "Buka di Google Maps" (open new tab).

Untuk superadmin: tombol "Edit" dan "Hapus" tersedia di pojok kanan atas.

Untuk admin: tombol Edit/Hapus TIDAK tampil.

## 8. Property Management — CRUD (Hanya Superadmin)

### AC-8.1 Create Properti

Tombol "+ Tambah Properti" hanya tampil untuk superadmin di halaman listing.

Form dengan semua field di AC-6.1, layout grid 2 kolom.

Validasi client-side (instant feedback) DAN server-side (security).

Setelah submit sukses: toast notification + redirect ke halaman listing dengan entry baru di-highlight.

Optional: tombol "Simpan & Tambah Lagi" untuk input cepat berurutan.

### AC-8.2 Update Properti

Form edit menggunakan layout yang sama dengan form create, dengan data ter-prefill.

Field yang berubah ditandai (dirty state indicator).

Tombol "Batal" mengembalikan ke halaman detail tanpa menyimpan.

Setiap perubahan dicatat di audit log (who, when, what changed).

### AC-8.3 Delete Properti

Tombol "Hapus" memunculkan modal konfirmasi dengan teks: "Yakin hapus properti [nama]? Tindakan ini tidak dapat dibatalkan."

Implementasi: soft delete (set deleted_at timestamp), bukan hard delete.

Properti yang sudah dihapus TIDAK muncul di listing publik maupun internal default view.

Superadmin dapat melihat & restore properti terhapus melalui menu "Arsip" (opsional Phase 2).

### AC-8.4 Validasi Form

- nama_property: minimum 3 karakter, maksimum 100 karakter.
- lebar & panjang: harus > 0, max 2 desimal.
- price: harus > 0, integer rupiah.
- tingkat: 1 – 10, max 1 desimal.
- maps_link: harus URL valid yang berisi domain google.com/maps.

Error ditampilkan inline di bawah field bermasalah, dengan warna #B33A3A.

## 9. Non-Functional Requirements

### AC-9.1 Performance

Time to First Contentful Paint (FCP) < 1.5s di koneksi 4G.

Filter & search response < 500ms untuk dataset hingga 1000 properti.

Lighthouse Performance Score ≥ 85 untuk landing page.

### AC-9.2 Security

Semua endpoint internal dilindungi authentication middleware.

CSRF protection untuk semua mutasi (POST/PUT/PATCH/DELETE).

Rate limiting: 100 req/menit/IP global, 10 req/menit/IP untuk endpoint auth.

Password (jika digunakan) di-hash menggunakan bcrypt (cost factor ≥ 10).

HTTPS-only di production, secure cookie flag aktif.

Input sanitization untuk mencegah XSS & SQL injection.

### AC-9.3 Bahasa & Lokalisasi

Seluruh UI menggunakan Bahasa Indonesia.

Format mata uang: Rp 1.350.000.000 (titik sebagai separator ribuan).

Format tanggal: 24 Mei 2026 atau 24/05/2026.

Timezone: Asia/Jakarta (WIB) untuk semua timestamp display.

### AC-9.4 Browser Support

Chrome / Edge / Firefox / Safari versi 2 tahun terakhir.

Mobile Safari iOS 14+, Chrome Android.

## 10. Deliverables & Acceptance

### AC-10.1 Definition of Done

Fitur dinyatakan DONE jika memenuhi seluruh kriteria berikut:

1. Semua acceptance criteria di atas terpenuhi dan teruji.
2. Tidak ada bug priority High/Critical yang terbuka.
3. UI sesuai dengan brand guidelines (palette, typography, logo placement).
4. Responsive di mobile, tablet, dan desktop.
5. Backend authorization terverifikasi (admin tidak bisa CRUD).
6. Filter dan search berjalan dengan dataset minimal 50 properti dummy.
7. Dokumentasi singkat untuk superadmin tentang cara manage properti.

---

PRIME PROPERTY · Acceptance Criteria Document · Versi 1.0

Dokumen ini menjadi rujukan utama bagi tim development dan QA selama fase implementasi.
