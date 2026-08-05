/**
 * Error sanitization - pure, copied from old project (no InsForge deps).
 */
export function sanitizeErrorForClient(error: unknown, context?: "ac"): string {
	if (!(error instanceof Error))
		return "Terjadi kesalahan yang tidak diketahui.";

	const msg = error.message;

	if (context === "ac") {
		if (msg.includes("Respons kosong"))
			return "AI mengembalikan respon kosong. Silakan generate ulang.";
		if (
			msg.includes("Failed to save AC version") ||
			msg.includes("Failed to insert AC version")
		) {
			return "Penyimpanan ke database terlalu lama (timeout). Silakan klik tombol 'Retry Simpan' untuk mencoba menyimpan ulang hasil.";
		}
	}

	if (
		msg.toLowerCase().includes("timed out") ||
		msg.toLowerCase().includes("aborted")
	) {
		return "Penyimpanan ke database terlalu lama (timeout). Silakan klik tombol 'Retry Simpan' untuk mencoba menyimpan ulang hasil.";
	}

	if (msg.includes("504") || msg.includes("timeout") || msg.includes("Edge")) {
		return "Generate PRD terlalu lama (server timeout). PRD mungkin sudah tersimpan sebagian - refresh halaman. Tips: pakai model ringan seperti Ling 3.0 Flash untuk generate yang lebih cepat.";
	}

	if (msg.includes("9Router") || msg.includes("fetch")) {
		return "Maaf, layanan AI sedang tidak tersedia atau sibuk. Silakan coba lagi dalam beberapa saat.";
	}

	if (msg.includes("rate") || msg.includes("429"))
		return "Terlalu banyak permintaan. Silakan tunggu sebentar.";

	if (
		msg.includes("pgrst") ||
		msg.includes("PostgrestError") ||
		msg.includes("insforge")
	) {
		return "Terjadi kesalahan pada server. Silakan coba lagi.";
	}

	if (msg.includes("Unauthorized") || msg.includes("401"))
		return "Sesi Anda telah berakhir. Silakan login kembali.";

	if (
		msg.includes("Semua model") ||
		msg.includes("Limit") ||
		msg.includes("Gagal")
	)
		return msg;

	return "Terjadi kesalahan yang tidak diketahui.";
}
