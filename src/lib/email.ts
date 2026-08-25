/**
 * Resend email wrapper — best-effort delivery (spec §7.1).
 *
 * ponytail: dynamic import keeps the SDK out of any bundle that merely type-
 * references this module, consistent with db/pg handling. Callers must treat
 * `false` as "not sent, continue anyway" — email NEVER breaks a request path.
 */

export interface SendEmailArgs {
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<boolean> {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		console.warn("[email] RESEND_API_KEY missing — skipping send");
		return false;
	}
	try {
		const { Resend } = await import("resend");
		const client = new Resend(apiKey);
		const from = process.env.EMAIL_FROM || "NovaPlan <onboarding@resend.dev>";
		const { error } = await client.emails.send({
			from,
			to: args.to,
			subject: args.subject,
			html: args.html,
		});
		if (error) {
			console.error("[email] resend rejected:", error);
			return false;
		}
		return true;
	} catch (err) {
		console.error("[email] send failed:", err);
		return false;
	}
}

function shell(title: string, bodyHtml: string): string {
	return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937">
<h2 style="margin:0 0 12px">${title}</h2>
${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#6b7280">Email otomatis dari NovaPlan.</p>
</div>`;
}

export function preExpiryNoticeEmail(
	planName: string,
	endDate: Date,
): { subject: string; html: string } {
	const dateLabel = endDate.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	return {
		subject: `Masa aktif ${planName} kamu berakhir ${dateLabel}`,
		html: shell(
			`Masa aktif ${planName} segera berakhir`,
			`<p>Halo!</p><p>Paket <b>${planName}</b> kamu akan berakhir pada <b>${dateLabel}</b>. Sisa kredit bulan ini hangus setelah periode berakhir.</p>
<p><a href="${process.env.APP_URL || ""}/pricing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Perpanjang sekarang</a></p>`,
		),
	};
}

export function pausedReminderEmail(
	planName: string,
	daysLate: number,
): { subject: string; html: string } {
	return {
		subject: `Akun ${planName} kamu sedang pause ${daysLate} hari`,
		html: shell(
			`Langganan ${planName} sedang pause`,
			`<p>Sudah <b>${daysLate} hari</b> sejak masa aktif ${planName} berakhir. Selama pause kamu masih bisa melihat semua proyek, tapi generate terkunci.</p>
<p>Pilih salah satu: <b>perpanjang</b> untuk lanjut full workflow, atau <b>batalkan</b> untuk kembali ke paket Free.</p>
<p><a href="${process.env.APP_URL || ""}/settings/billing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Kelola langganan</a></p>`,
		),
	};
}
