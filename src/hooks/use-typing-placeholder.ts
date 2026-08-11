import { useEffect, useRef, useState } from "react";

const WEB_PROMPTS = [
	"Buatkan platform manajemen proyek untuk tim remote — fitur task board, time tracking, real-time collaboration, dan dashboard progress per sprint...",
	"Saya butuh sistem POS untuk restoran dengan menu digital, order management ke dapur, split bill, dan laporan penjualan harian...",
	"Buat marketplace UMKM dengan sistem katalog produk, keranjang belanja, integrasi pembayaran Midtrans, dan dashboard seller...",
	"Buatkan dashboard CRM untuk tim sales — pipeline management, lead scoring, email integration, dan analitik konversi...",
];

const MOBILE_PROMPTS = [
	"Buatkan aplikasi delivery barang same-day dengan tracking GPS real-time, notifikasi status pesanan, dan sistem rating pengemudi...",
	"Saya ingin buat app reservasi rumah sakit — pilih dokter, jadwal konsultasi, rekam medis digital, dan reminder obat...",
	"Buat aplikasi personal finance dengan scan struk otomatis, kategorisasi pengeluaran, target tabungan, dan insight bulanan...",
	"Buatkan app komunitas hobi dengan fitur event organizer, forum diskusi, galeri foto, dan sistem point reward...",
];

export function useTypingPlaceholder(isMobile: boolean) {
	const prompts = isMobile ? MOBILE_PROMPTS : WEB_PROMPTS;
	const [display, setDisplay] = useState("");
	const indexRef = useRef(0);
	const charRef = useRef(0);
	const phaseRef = useRef<"typing" | "pausing" | "deleting">("typing");

	useEffect(() => {
		indexRef.current = 0;
		charRef.current = 0;
		phaseRef.current = "typing";
		setDisplay("");
	}, []);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;

		const tick = () => {
			if (document.hidden) return; // don't advance/schedule while tab is hidden
			const current = prompts[indexRef.current % prompts.length];

			if (phaseRef.current === "typing") {
				if (charRef.current < current.length) {
					charRef.current++;
					setDisplay(current.slice(0, charRef.current));
					timer = setTimeout(tick, 30 + Math.random() * 30);
				} else {
					phaseRef.current = "pausing";
					timer = setTimeout(tick, 2500);
				}
			} else if (phaseRef.current === "pausing") {
				phaseRef.current = "deleting";
				timer = setTimeout(tick, 50);
			} else {
				if (charRef.current > 0) {
					charRef.current = Math.max(0, charRef.current - 2);
					setDisplay(current.slice(0, charRef.current));
					timer = setTimeout(tick, 15);
				} else {
					indexRef.current++;
					phaseRef.current = "typing";
					timer = setTimeout(tick, 400);
				}
			}
		};

		const handleVisibilityChange = () => {
			if (!document.hidden) {
				clearTimeout(timer);
				timer = setTimeout(tick, 60);
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		timer = setTimeout(tick, 500);
		return () => {
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [prompts]);

	return display;
}
