# Spec: AC Generation Reliability Fix

## 1. Problem Statement

Proses generate Acceptance Criteria (AC) pada NovaPlan AI mengalami kegagalan intermiten saat melakukan penyimpanan data ke database InsForge setelah stream AI selesai.

Log server menunjukkan error:
```
saveAcVersion failed: InsForgeError: Request timed out after 30000ms
  at HttpClient.fetchWithRetry
  at async saveAcVersion (src/lib/services/ac-service.ts)
  at async safeDone (src/app/api/ac/generate/route.ts)
Error: aborted ECONNRESET
uncaughtException: Error: aborted
```

### Masalah Utama:
1. **DB Save Timeout & No Retry**: Output AC dari model AI sangat besar (>300 baris, banyak tabel schema dan formula cascading discount). Insert string besar ke database Postgres via InsForge SDK dibatasi hard timeout 30 detik. Saat terjadi cold-start database atau network latency spike, request hang lalu timeout. Tanpa retry, seluruh hasil streaming AI yang sudah dinanti user selama 2 menit langsung hilang.
2. **Sanitizer Bug**: Error-sanitizer (`error-sanitizer.ts`) hanya meloloskan substring `Semua model|Limit|Gagal`. Error timeout database disaring menjadi generic error message `"Terjadi kesalahan yang tidak diketahui"`. User tidak tahu bahwa AC mereka gagal disimpan dan mengira sistem stuck.
3. **Aborted Stream & Client Disconnect Race**: Saat backend melempar timeout error setelah stream ditutup, Next.js melempar error `aborted ECONNRESET` ke `uncaughtException` global. Hal ini memicu dev server crash/restart secara tidak bersih.
4. **No Client Recovery & Fallback**: Client component (`ac-detail.tsx`) tidak memiliki mekanisme recovery jika penyimpanan gagal. Data AC yang sudah di-stream ke client hilang begitu saja. Tidak ada tombol untuk mencoba menyimpan ulang data yang sudah di-render ke UI.

---

## 2. Solution

Membangun mekanisme ketahanan penyimpanan database (Reliable DB Save) menggunakan strategy auto-retry dengan exponential backoff pada server, memperluas whitelist sanitizer, memisahkan lifecycle streaming vs lifecycle database persistence pada route handler untuk mencegah race condition abort, dan menyediakan client recovery flow.

High-level fixes:
- **Server DB Retry**: Implementasi shared helper retry database dengan exponential backoff + jitter untuk insert payload besar ke InsForge.
- **Client Recovery Endpoint**: Membuat REST endpoint `/api/ac/save` minimal untuk recovery. Jika SSE route gagal menyimpan otomatis, client bisa memicu manual/auto save payload AC yang sudah di-render di browser ke database.
- **Sanitizer Context**: Update whitelist agar known errors (timeout database, empty response) diteruskan dalam format ramah Bahasa Indonesia.
- **SSE Non-Abortable Save**: Membagi logic handler: Abort signal client hanya menghentikan generator AI stream (Phase 1), tidak menghentikan database insert (Phase 2) jika content sudah berhasil ter-generate penuh.

---

## 3. User Stories

### US-1: Auto-Retry Penyimpanan AC (Server-side)
As an Admin, I want the system to retry inserting the generated AC to the database when a transient network error or timeout occurs, so that we minimize writing failures.
- **AC-1.1**: Penyimpanan AC via `saveAcVersion` harus mencoba ulang otomatis hingga 3 kali jika mendeteksi `InsForgeError`, `timeout`, atau status error `5xx`.
- **AC-1.2**: Jeda waktu antar percobaan menggunakan exponential backoff: Attempt 1 (500ms), Attempt 2 (1500ms), Attempt 3 (4000ms).
- **AC-1.3**: Setiap percobaan kegagalan dicatat ke log server dengan format terstruktur: `[DB RETRY] Attempt N failed for project ID: [ID] - Error: [Error Message]`.
- **AC-1.4**: Jika berhasil pada attempt ke-2 atau ke-3, status project `ac_status` tetap diset `'completed'` dan event `'done'` dikirim ke client.

### US-2: Client-side Recovery (Retry Simpan)
As a user, I want to be able to save the generated AC that is already rendered on my screen if the automatic database save fails, so that I don't lose the result and have to generate it again from scratch.
- **AC-2.1**: Jika automatic database save gagal setelah semua retry habis, client menerima event `type: "error"` dengan detail "Gagal menyimpan AC".
- **AC-2.2**: UI `ac-detail.tsx` menampilkan banner warning di atas halaman viewer: *"AC berhasil digenerate tetapi gagal disimpan karena masalah koneksi database."*
- **AC-2.3**: Banner tersebut menyediakan tombol **"Retry Simpan (Tanpa AI)"** warna oranye/kuning dan tombol **"Generate Ulang"** warna netral.
- **AC-2.4**: Mengklik "Retry Simpan" mengirimkan payload `streamingContent` (yang sudah ter-render di client) ke endpoint baru `POST /api/ac/save`.
- **AC-2.5**: Jika request save sukses, banner ditutup, toast success ditampilkan, and UI ter-refresh menampilkan AC yang tersimpan.

### US-3: Whitelist Error & Context Sanitizer
As a Developer, I want to see specific error messages when generation fails, so that I don't get generic "Terjadi kesalahan tidak diketahui" error alerts.
- **AC-3.1**: Whitelist error sanitizer harus meloloskan error string: `Respons kosong dari chunk model`, `Failed to save AC version`, dan pattern `timeout` atau `aborted`.
- **AC-3.2**: Error timeout dari InsForge diubah menjadi pesan ramah Bahasa Indonesia: *"Penyimpanan ke database terlalu lama (timeout). Silakan klik tombol 'Retry Simpan' untuk mencoba menyimpan ulang hasil."*
- **AC-3.3**: Error kosong dari AI diubah menjadi: *"AI mengembalikan respon kosong. Silakan generate ulang."*

### US-4: Non-Abortable Database Phase
As an Operator, I want database operations to finish writing even if the user closes their browser tab mid-save, so that we don't end up with partial/corrupted generation states and prevent ECONNRESET.
- **AC-4.1**: Route handler `api/ac/generate/route.ts` memisahkan input abort signal client. Abort listener diaktifkan penuh pada Phase 1 (AI streaming).
- **AC-4.2**: Jika AI stream selesai dan masuk ke Phase 2 (Penyimpanan database), abort listener dinonaktifkan. Proses database save tetap diproses sampai selesai/timeout internal walaupun client terputus (tab ditutup / refresh halaman).
- **AC-4.3**: Jika data berhasil disimpan pasca client abort, data tetap tersimpan di database (version bertambah) sehingga saat user kembali membuka halaman, data AC sudah siap tanpa perlu generate ulang.
- **AC-4.4**: Penutupan stream di route handler dibungkus guard `if (!controller.signal.aborted)` untuk menghindari `uncaughtException ECONNRESET` di server log.

---

## 4. Implementation Decisions

- **Shared Retry Function**: Membuat utility function `withDbRetry` di `src/lib/services/db-retry.ts` untuk reuse di `saveAcVersion` dan `savePrdVersion`.
- **New API Route**: Menambahkan `src/app/api/ac/save/route.ts` dengan schema request `{ projectId: string, content: string }`.
- **Idempotency Guard**: Di dalam retry loop `saveAcVersion`, `nextVersion` harus di-fetch ulang dari DB sebelum melakukan insert. Hal ini mencegah error duplicate key jika database sebenarnya berhasil memproses insert sebelumnya tetapi client timeout.
- **Sanitizer Context**: Mengubah parameter `sanitizeErrorForClient(error)` menjadi `sanitizeErrorForClient(error, context?: string)` untuk penyesuaian pesan AC.

---

## 5. Testing Decisions

### Seams (Tempat Pengujian):
1. **Mock DB Interceptor**: Menyediakan environment variable `MOCK_DB_FAIL_COUNT=2` di local development. Jika diset, database handler akan melempar `InsForgeError: Timeout` sebanyak N kali sebelum akhirnya memproses database insert.
2. **Network Network Throttling**: Menggunakan browser developer tools throttling (Offline/Slow 3G) saat stream AI selesai untuk memicu abort signal mid-save.

### DoD (Definition of Done):
- Menjalankan simulasi `MOCK_DB_FAIL_COUNT=2`. Verify log server menampilkan 2x retry log dan AC akhirnya tersimpan sukses di attempt ke-3.
- Menjalankan simulasi `MOCK_DB_FAIL_COUNT=4` (melebihi limit retry). Verify client menampilkan warning banner recovery dan tombol "Retry Simpan" berfungsi menyimpan AC.
- Menutup browser tab tepat saat streaming AI selesai (masuk fase save). Buka kembali halaman AC. Verify data AC tersimpan penuh tanpa duplikasi.
- Menjalankan build command `npm run build` dan verify typecheck `npx tsc --noEmit` hijau bersih.

---

## 6. Out-of-Scope Items

- **Realtime Collaboration Sync**: Menangani race condition jika dua user menekan tombol "Retry Simpan" secara bersamaan untuk project yang sama.
- **Auto-draft Syncing**: Mengirimkan draft AC ke server per 10 detik selama streaming (kita hanya rely pada rendering client state `streamingContent`).
- **Database Index Optimization**: Menambahkan index SQL baru secara manual ke PostgreSQL (kita hanya menggunakan query re-fetch logic yang sudah ada).

---

## 7. Further Notes

- Keterbatasan quota localStorage/sessionStorage (5MB) di browser: content AC yang melebihi 4 juta karakter (jarang terjadi) akan diabaikan oleh draft backup sessionStorage untuk menghindari DOMException quota exceeded.
- Modifikasi UI pada table of contents di AC harus mematuhi shared component layout yang diatur oleh `table-of-contents.tsx`.
