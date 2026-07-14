/**
 * Error message sanitization for client-facing responses.
 * Prevents leaking internal error details to the frontend.
 */

/**
 * Sanitize an error for client display.
 * Replaces technical error details with user-friendly Indonesian messages.
 */
export function sanitizeErrorForClient(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Terjadi kesalahan yang tidak diketahui.";
  }

  const msg = error.message;

  // Gateway timeout / edge runtime cutoff (prod issue: server silently killed at
  // 60s but DB write may have already persisted the PRD).
  if (msg.includes("504") || msg.includes("timeout") || msg.includes("Edge")) {
    return "Generate PRD terlalu lama (server timeout). PRD mungkin sudah tersimpan sebagian — refresh halaman. Tips: pakai model ringan seperti Llama 3.1 (8B) untuk generate yang lebih cepat.";
  }

  // NVIDIA API / network errors
  if (msg.includes("NVIDIA") || msg.includes("fetch")) {
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
