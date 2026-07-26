/**
 * Error message sanitization for client-facing responses.
 * Prevents leaking internal error details to the frontend.
 */

/**
 * Sanitize an error for client display.
 * Replaces technical error details with user-friendly Indonesian messages.
 * `context` narrows the mapping for callers whose generic messages differ (e.g. "ac").
 */
export function sanitizeErrorForClient(error: unknown, context?: "ac"): string {
  if (!(error instanceof Error)) {
    return "Terjadi kesalahan yang tidak diketahui.";
  }

  const msg = error.message;

  // AC-specific mappings (PRD US-3): AI orchestrator empty-chunk error and DB save
  // failures need friendlier, actionable copy pointing at the recovery flow.
  if (context === "ac") {
    if (msg.includes("Respons kosong")) {
      return "AI mengembalikan respon kosong. Silakan generate ulang.";
    }
    if (msg.includes("Failed to save AC version") || msg.includes("Failed to insert AC version")) {
      return "Penyimpanan ke database terlalu lama (timeout). Silakan klik tombol 'Retry Simpan' untuk mencoba menyimpan ulang hasil.";
    }
  }

  // Database timeout/abort (any caller) — same friendly copy as the AC save-timeout case.
  if (msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("aborted")) {
    return "Penyimpanan ke database terlalu lama (timeout). Silakan klik tombol 'Retry Simpan' untuk mencoba menyimpan ulang hasil.";
  }

  // Gateway timeout / edge runtime cutoff (prod issue: server silently killed at
  // 60s but DB write may have already persisted the PRD).
  if (msg.includes("504") || msg.includes("timeout") || msg.includes("Edge")) {
    return "Generate PRD terlalu lama (server timeout). PRD mungkin sudah tersimpan sebagian — refresh halaman. Tips: pakai model ringan seperti Llama 3.1 (8B) untuk generate yang lebih cepat.";
  }

  // API provider / network errors
  if (msg.includes("9Router") || msg.includes("fetch")) {
    return "Maaf, layanan AI sedang tidak tersedia atau sibuk. Silakan coba lagi dalam beberapa saat.";
  }

  // Rate limit errors
  if (msg.includes("rate") || msg.includes("429")) {
    return "Terlalu banyak permintaan. Silakan tunggu sebentar.";
  }

  // Database errors (don't expose details)
  if (msg.includes("pgrst") || msg.includes("PostgrestError") || msg.includes("insforge")) {
    return "Terjadi kesalahan pada server. Silakan coba lagi.";
  }

  // Authentication errors
  if (msg.includes("Unauthorized") || msg.includes("401")) {
    return "Sesi Anda telah berakhir. Silakan login kembali.";
  }

  // All other errors (pass through only if reasonably user-friendly)
  // Check if it already looks like a user-facing Indonesian message
  if (msg.includes("Semua model") || msg.includes("Limit") || msg.includes("Gagal")) {
    return msg;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}
