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

  // NVIDIA API / network errors
  if (msg.includes("NVIDIA") || msg.includes("fetch")) {
    return "Maaf, layanan AI sedang tidak tersedia atau sibuk. Silakan coba lagi dalam beberapa saat.";
  }

  // Rate limit errors
  if (msg.includes("rate") || msg.includes("429")) {
    return "Terlalu banyak permintaan. Silakan tunggu sebentar.";
  }

  // Database errors (don't expose details)
  if (msg.includes("pgrst") || msg.includes("PostgrestError") || msg.includes("supabase")) {
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
