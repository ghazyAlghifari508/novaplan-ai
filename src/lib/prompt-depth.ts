/**
 * Tier-based output depth for generated documents.
 *
 * Depth is resolved from the MODEL used (not the user's plan), so a Pro user who
 * picks a free model gets free-tier depth. Section structure is IDENTICAL across
 * tiers — only the richness of the content inside each section changes.
 *
 * ponytail: appended as a plain suffix to the existing prompts, no prompt rewrite.
 */
import type { Plan } from "@/types/database";
import { findModel } from "./model-config";

export type DocKind = "prd" | "ac" | "task";

export function getDepthTier(modelId: string): Plan {
	return findModel(modelId).tier;
}

const PRD: Record<Plan, string> = {
	free: `
## MODE KEDALAMAN: RINGKAS
SEMUA section 1-8 WAJIB tetap ada dan tetap terisi dengan nama yang sama. Yang berubah HANYA kedalaman isinya:
- Latar Belakang & Deskripsi Produk: masing-masing 1 paragraf pendek (2-3 kalimat).
- Target Pengguna: tabel 3 role.
- Nilai Proposisi: 3 poin.
- Business Goals: 3 poin. KPI: tabel 4 metrik.
- Functional Requirements: 2-3 domain, tiap domain 3 bullet.
- Non-Functional Requirements: 4 poin. Integrasi: tabel 2-3 layanan.
- Core Features: jabarkan 3-4 fitur inti saja, tiap fitur 1 paragraf + 3 bullet.
- User Flow: 1 flow utama + 1 flow tambahan.
- Tech Stack: tabel ringkas. Struktur folder: level 2 saja.
- Database Schema: tabel inti saja (3-5 tabel) + ERD relasi utama.
- Design & Technical Constraints: masing-masing tabel 4 baris.
Tulis padat. Jangan melebar ke edge case sekunder.`,

	pro: `
## MODE KEDALAMAN: STANDAR
SEMUA section 1-8 WAJIB tetap ada dengan nama yang sama. Kedalaman isi level menengah:
- Latar Belakang & Deskripsi Produk: masing-masing 2 paragraf.
- Target Pengguna: tabel 4-5 role dengan deskripsi tugas spesifik.
- Nilai Proposisi: 4-5 poin.
- Business Goals: 5 poin bertarget angka. KPI: tabel 6 metrik dengan target numerik.
- Functional Requirements: 4-5 domain, tiap domain paragraf pengantar + 4-5 bullet mencakup validasi.
- Non-Functional Requirements: 6 poin dengan angka. Integrasi: tabel 4-5 layanan.
- Core Features: jabarkan seluruh fitur utama, tiap fitur 1-2 paragraf + bullet logika bisnis.
- User Flow: 1 flow utama (mermaid) + 2-3 flow tambahan.
- Tech Stack: tabel per layer + alasan teknis. Struktur folder: level 3.
- Database Schema: seluruh tabel utama + relasi, tipe data lengkap, enum + ERD lengkap.
- Design & Technical Constraints: masing-masing tabel 6 baris.`,

	hengker: `
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
Ini tier tertinggi: JANGAN menahan detail. Dokumen harus langsung bisa dieksekusi engineering tanpa pertanyaan susulan.`,
};

const AC: Record<Plan, string> = {
	free: `
## MODE KEDALAMAN: RINGKAS
Struktur dokumen tetap sama (Glossary, section per fitur, NFR, Definition of Done) - SEMUA section tetap ada. Yang dikurangi hanya kedalaman:
- Glossary: 8 baris (minimum tetap dijaga).
- Cakup 3-4 fitur utama dari PRD saja.
- Tiap fitur: 3-4 AC-N.M. Tetap testable dengan angka konkret.
- Tabel Field schema: hanya untuk fitur yang punya form/entity.
- Scenario Given/When/Then: cukup 1 untuk dokumen.
- Master Calculation Reference: hanya jika ada formula.
Target sekitar 100-150 baris. Tetap presisi, jangan generik.`,

	pro: `
## MODE KEDALAMAN: STANDAR
Struktur dokumen tetap sama - SEMUA section tetap ada. Kedalaman menengah:
- Glossary: 10-12 baris.
- Cakup seluruh fitur utama dari PRD.
- Tiap fitur: 5-6 AC-N.M mencakup happy path, validasi batas, dan authorization.
- Tabel Field schema wajib untuk tiap fitur berbasis data.
- Scenario Given/When/Then: 1 per fitur bisnis multi-langkah.
- Master Calculation Reference wajib jika ada >=2 formula.
Target sekitar 250-300 baris.`,

	hengker: `
## MODE KEDALAMAN: MAKSIMAL (EXHAUSTIVE)
Struktur dokumen tetap sama - SEMUA section tetap ada, diisi sedalam mungkin:
- Glossary: 14+ baris mencakup seluruh istilah domain, status enum, role, satuan, dan singkatan PRD.
- Cakup SETIAP fitur di PRD tanpa terkecuali.
- Tiap fitur: 8-10 AC-N.M mencakup happy path, validasi batas min/max/enum/format, authorization per role, edge case (duplicate, soft-delete, concurrency, history preserved), error message eksplisit beserta kode status, dan perilaku saat dependency gagal.
- Tabel Field schema wajib lengkap: Field | Tipe Data | Wajib | Keterangan/Contoh, termasuk constraint dan nilai default.
- Scenario Given/When/Then: minimal 1 per fitur bisnis, plus minimal 1 skenario kegagalan/rollback.
- Master Calculation Reference wajib jika ada formula, tulis penuh dengan contoh angka.
- NFR diperluas: performa, keamanan, observability, backup/restore, aksesibilitas, kompatibilitas browser.
Target 400+ baris. Ini tier tertinggi: dokumen harus siap audit tanpa pertanyaan susulan.`,
};

const TASK: Record<Plan, string> = {
	free: `
## MODE KEDALAMAN: RINGKAS
Struktur JSON tetap sama persis (features -> tasks -> subtasks -> details) dan SEMUA fitur dari AC tetap dibuat. Yang dikurangi hanya kedalaman:
- 2-3 task per fitur (task inti saja: implementation + integration).
- 1-3 subtask per task.
- 1-2 item details per subtask, ditulis padat.
Fokus ke jalur utama. Lewati langkah opsional dan optimisasi.`,

	pro: `
## MODE KEDALAMAN: STANDAR
Struktur JSON tetap sama persis dan SEMUA fitur dari AC tetap dibuat. Kedalaman menengah:
- 3-4 task per fitur (setup, implementation, testing, integration).
- 2-4 subtask per task, disesuaikan kompleksitas.
- 2-4 item details per subtask, tiap item langkah konkret < 30 menit.
Cakup validasi dan error handling utama.`,

	hengker: `
## MODE KEDALAMAN: MAKSIMAL (EXHAUSTIVE)
Struktur JSON tetap sama persis dan SEMUA fitur dari AC tetap dibuat, dipecah sedalam mungkin:
- 4-6 task per fitur: setup/migration, implementation, validasi & error handling, testing (unit + integration), integration/wiring, dan observability bila relevan.
- 3-7 subtask per task, tiap subtask deliverable atomik yang bisa di-PR terpisah.
- 4-6 item details per subtask: nama file/tabel/endpoint konkret, nama fungsi, kondisi edge case, dan kriteria selesai.
Ini tier tertinggi: JANGAN menahan detail. Engineer harus bisa langsung mengeksekusi tiap detail tanpa bertanya.`,
};

const TABLES: Record<DocKind, Record<Plan, string>> = {
	prd: PRD,
	ac: AC,
	task: TASK,
};

export function depthDirective(kind: DocKind, modelId: string): string {
	return TABLES[kind][getDepthTier(modelId)];
}
