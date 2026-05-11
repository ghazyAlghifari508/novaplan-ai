# NovaPlan Launch Checklist — Fase 9

## Prasyarat
- [ ] Akun Vercel (deployment)
- [ ] Akun Supabase (database + auth + storage)
- [ ] Akun Sentry (error monitoring)
- [ ] Akun Resend (transactional email)
- [ ] Akun Midtrans (payment gateway — sandbox mode)

---

## 1. Environment Variables

Salin `.env.example` ke `.env.local` dan isi semua nilai:

```bash
cp .env.example .env.local
```

| Variable | Sumber | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Format: `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public key (aman untuk client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | **JANGAN expose ke client** |
| `OPENROUTER_API_KEY` | openrouter.ai → API Keys | Server-side only |
| `MIDTRANS_SERVER_KEY_SANDBOX` | Midtrans Dashboard | Sandbox only |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX` | Midtrans Dashboard | Public, untuk client-side SNAP.js |
| `RESEND_API_KEY` | resend.com → API Keys | Untuk feedback email |
| `FEEDBACK_EMAIL` | Email kamu | Untuk menerima feedback |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Domain production |
| `SENTRY_DSN` | Sentry → Project Settings → Client Keys | Error monitoring |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → API → Auth Tokens | Untuk upload source maps |
| `SENTRY_ORG` | `novaplan` | Organisasi Sentry |

---

## 2. Supabase Production Setup

### 2a. Buat Project Production
1. Buka https://supabase.com → Create new project
2. Pilih region yang sama dengan development (ap-southeast-1)
3. Set strong database password (simpan di password manager!)
4. Tunggu project ready (~2 menit)

### 2b. Jalankan Migrations
Dari komputer lokal:
```bash
supabase db push --project-ref YOUR_PROJECT_REF
```
Atau via SQL di Supabase Dashboard → SQL Editor, jalankan semua file di folder `migrations/` secara berurutan.

### 2c. Setup Storage Buckets
Di Supabase Dashboard → Storage:
1. Buat bucket `avatars` (public: false)
2. Buat bucket `prd-files` (public: false)

### 2d. Setup Auth Providers
Di Supabase Dashboard → Authentication → Providers:
1. **Google OAuth**: Aktifkan, masukkan Client ID + Secret dari Google Cloud Console
2. **Email**: Pastikan enabled dengan template yang sesuai

### 2e. Backup Otomatis
Di Supabase Dashboard → Database → Backups:
- Free tier: 7 daily backups (managed by Supabase)
- Pro tier: Point-in-time recovery + daily backups
- **Tidak perlu setup manual** — Supabase handles ini otomatis

Untuk backup manual atau schedule kustom, gunakan `pg_cron` extension yang sudah aktif.

---

## 3. Vercel Deployment

### 3a. Connect Repo
```bash
npm i -g vercel
vercel login
vercel link
```

### 3b. Environment Variables di Vercel
Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan semua variable dari `.env.local`.

**PENTING**: `SUPABASE_SERVICE_ROLE_KEY` harus设置为 **Server-side only** (bukan Public).

### 3c. Deploy
```bash
vercel --prod
```
Atau push ke `main` branch jika auto-deploy sudah aktif.

### 3d. Custom Domain
Di Vercel Dashboard → Project → Settings → Domains:
1. Tambahkan `novaplan.ai` (atau domain kamu)
2. Tambahkan record DNS sesuai instruksi Vercel
3. Tunggu verifikasi SSL certificate (~5 menit)

---

## 4. DNS Configuration

Tambahkan record DNS di provider domain kamu:

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | @ | `76.76.21.21` | Vercel redirect |
| CNAME | www | `cname.vercel-dns.com` | Vercel hosting |
| CNAME | api | `cname.vercel-dns.com` | API subdomain |

Tunggu propagasi DNS (15 menit - 48 jam).

---

## 5. Payment Gateway Setup

### Midtrans Sandbox → Production (jika ready)
1. Apply untuk Midtrans Production account
2. Ganti `SANDBOX` keys dengan Production keys di environment variables
3. Update `MIDTRANS_IS_PRODUCTION=true` di production

**CATATAN**: Untuk launch awal, tetap gunakan SANDBOX mode.

---

## 6. Sentry Setup

### 6a. Create Project
1. Buka https://sentry.io → New Project → Next.js
2. Ikuti wizard untuk install @sentry/nextjs

### 6b. Upload Source Maps (auto dari Vercel)
Dengan `@sentry/nextjs` v8+, source maps di-upload otomatis saat deployment via `SENTRY_AUTH_TOKEN`.

Pastikan `SENTRY_AUTH_TOKEN` sudah diset di Vercel environment variables.

### 6c. Verify
 Setelah deploy, cek di Sentry Dashboard apakah error dari production sudah masuk.

---

## 7. Post-Launch Monitoring

### Vercel Analytics
Otomatis aktif dengan `@vercel/analytics` package yang sudah ter-install.
Lihat data di Vercel Dashboard → Analytics.

### Sentry
Error reports dari user otomatis terkirim ke Sentry dashboard.

### Custom Monitoring (Optional)
Untuk tracking user behavior tambahan, bisa tambahkan:
- Posthog (product analytics)
- Logrocket (session replay)

---

## 8. Pre-Launch QA Checklist

### Authentication
- [ ] Register dengan email + password
- [ ] Login dengan Google OAuth
- [ ] Forgot password + magic link
- [ ] Sign out

### Chat & PRD Generation
- [ ] Chat input di landing page → redirect ke login
- [ ] Generate PRD baru (mode AI Auto)
- [ ] Generate PRD baru (mode Manual)
- [ ] Chat revision → PRD section update
- [ ] Version history di PRD page

### Dashboard
- [ ] List semua PRD (grid view)
- [ ] Search PRD by nama
- [ ] Filter (all/draft/completed)
- [ ] Sort (recent/oldest/name)

### Pricing & Payment
- [ ] Toggle monthly/yearly di pricing page
- [ ] Checkout Midtrans SNAP popup
- [ ] Webhook payment confirmation
- [ ] Quota update setelah payment

### Settings
- [ ] Edit profile + upload avatar
- [ ] Ganti email + password
- [ ] Notification preferences
- [ ] API keys (Hengker)
- [ ] Custom templates (Hengker)
- [ ] Feedback submission

### Mobile Responsive
- [ ] Landing page di mobile
- [ ] Dashboard di mobile (375px)
- [ ] Chat panel di mobile
- [ ] Settings pages di mobile

---

## 9. Soft Launch (50 Beta Users)

1. Invite via email personal dengan akun test
2. Instruksikan untuk:
   - Generate minimal 1 PRD
   - Report bug via `/settings/feedback`
   - Share ke social media jika puas
3. Monitor:
   - Sentry untuk error reports
   - Vercel Analytics untuk user behavior
   - Supabase Dashboard untuk DB usage

---

## 10. Public Launch

### Checklist
- [ ] Semua QA items di atas PASSED
- [ ] Tidak ada error critical di Sentry
- [ ] Database backup verified working
- [ ] SSL certificate active (green lock di browser)
- [ ] Midtrans Production account approved (jika ingin accept real payments)
- [ ] Terms of Service page created
- [ ] Privacy Policy page created

### Channels
- [ ] Product Hunt launch
- [ ] Twitter/X announcement
- [ ] LinkedIn post
- [ ] Indonesian tech communities (Kaskus, Reddit r/indonesia)
- [ ] Product PM communities (Product Coalition, etc.)

---

## 11. Emergency Rollback

Jika ada masalah critical:

```bash
# Rollback ke commit sebelumnya
vercel rollback

# Atau deploy specific version
vercel deploy --prebuilt [commit-sha] --prod
```

Database tidak perlu dirollback — masalah production biasanya di code, bukan di data.

---

## Catatan Penting

1. **Jangan pernah commit `.env.local`** — sudah ada di `.gitignore`
2. **Always use SANDBOX mode** untuk Midtrans sampai ready untuk production payments
3. **Test di Incognito** setelah setiap perubahan — cache bisa mislead
4. **Monitor Sentry** setiap hari di minggu pertama launch
5. **Supabase free tier** cukup untuk 50-100 beta users. Upgrade ke Pro jika quota exceed.

---

*Last updated: Fase 9 completion*