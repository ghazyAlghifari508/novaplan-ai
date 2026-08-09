/**
 * Output depth for generated documents (PRD/AC/Task).
 *
 * Every plan tier gets the same maximal-depth directive. Differentiation
 * between free/pro/hengker output quality now comes purely from which model
 * each tier is allowed to use (see model-config.ts), not from instructing
 * weaker prompts for lower tiers.
 */
export type DocKind = "prd" | "ac" | "task";

const PRD = `
## MODE KEDALAMAN: MAKSIMAL (EXHAUSTIVE)
SEMUA section 1-8 WAJIB tetap ada dengan nama yang sama, diisi selengkap dan sedalam mungkin:
- Latar Belakang: 2-3 paragraf termasuk kondisi pasar dan biaya dari masalah saat ini. Deskripsi Produk: 2-3 paragraf termasuk pembeda kompetitif.
- Target Pengguna: tabel 5-7 role lengkap dengan kebutuhan dan hak akses tiap role.
- Nilai Proposisi: 5-6 poin, tiap poin terhubung ke pain point konkret.
- Business Goals: 7 poin dengan target dan tenggat. KPI: tabel 8 metrik dengan baseline dan target.
- Functional Requirements: 6+ domain, tiap domain paragraf pengantar + 5 bullet mencakup alur normal, validasi, DAN edge case/error handling.
- Non-Functional Requirements: 8 poin bernomor (performa, skalabilitas, keamanan, ketersediaan, observability, backup, kompatibilitas, aksesibilitas) dengan angka pasti. Integrasi: tabel 5+ layanan berikut fallback jika layanan mati.
- Core Features: jabarkan SETIAP fitur tanpa terkecuali, tiap fitur 2 paragraf + bullet sub-fitur + aturan bisnis + kondisi gagal.
- User Flow: 1 flow utama (mermaid sequenceDiagram) + 3-4 flow tambahan termasuk minimal 1 flow error/recovery.
- Architecture: diagram mermaid detail termasuk layer caching/queue/storage bila relevan. Tech Stack: tabel per layer + alasan + alternatif yang ditolak. Struktur folder: tree penuh sampai level file kunci.
- Database Schema: skema penuh semua tabel termasuk tabel pivot/audit, index, constraint, enum + ERD lengkap beratribut.
- Design & Technical Constraints: masing-masing tabel 8 baris dengan nilai spesifik (token TTL, ukuran payload, rate limit, breakpoint, skala tipografi).
JANGAN menahan detail. Dokumen harus langsung bisa dieksekusi engineering tanpa pertanyaan susulan.`;

const AC = `
## MODE KEDALAMAN: MAKSIMAL (EXHAUSTIVE)
Struktur dokumen tetap sama - SEMUA section tetap ada, diisi sedalam mungkin:
- Glossary: 14+ baris mencakup seluruh istilah domain, status enum, role, satuan, dan singkatan PRD.
- Cakup SETIAP fitur di PRD tanpa terkecuali.
- Tiap fitur: 8-10 AC-N.M mencakup happy path, validasi batas min/max/enum/format, authorization per role, edge case (duplicate, soft-delete, concurrency, history preserved), error message eksplisit beserta kode status, dan perilaku saat dependency gagal.
- Tabel Field schema wajib lengkap: Field | Tipe Data | Wajib | Keterangan/Contoh, termasuk constraint dan nilai default.
- Scenario Given/When/Then: minimal 1 per fitur bisnis, plus minimal 1 skenario kegagalan/rollback.
- Master Calculation Reference wajib jika ada formula, tulis penuh dengan contoh angka.
- NFR diperluas: performa, keamanan, observability, backup/restore, aksesibilitas, kompatibilitas browser.
Target 400+ baris. Dokumen harus siap audit tanpa pertanyaan susulan.`;

const TASK = `
## MODE KEDALAMAN: MAKSIMAL (EXHAUSTIVE)
Struktur JSON tetap sama persis dan SEMUA fitur dari AC tetap dibuat, dipecah sedalam mungkin:
- 4-6 task per fitur: setup/migration, implementation, validasi & error handling, testing (unit + integration), integration/wiring, dan observability bila relevan.
- 3-7 subtask per task, tiap subtask deliverable atomik yang bisa di-PR terpisah.
- 4-6 item details per subtask: nama file/tabel/endpoint konkret, nama fungsi, kondisi edge case, dan kriteria selesai.
JANGAN menahan detail. Engineer harus bisa langsung mengeksekusi tiap detail tanpa bertanya.`;

const TABLES: Record<DocKind, string> = { prd: PRD, ac: AC, task: TASK };

export function depthDirective(kind: DocKind): string {
	return TABLES[kind];
}
