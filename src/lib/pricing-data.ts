export type BillingCycle = "monthly" | "annually";

export interface Feature {
	key: string;
	name: string;
	isIncluded: boolean;
	tooltip?: string;
}

export interface PriceTier {
	id: string;
	name: string;
	description: string;
	priceMonthly: number;
	priceAnnually: number;
	isPopular: boolean;
	buttonLabel: string;
	features: Feature[];
}

export const novaPlanPlans: [PriceTier, PriceTier, PriceTier] = [
	{
		id: "free",
		name: "Free",
		description: "Cocok untuk pemula yang ingin mencoba NovaPlan.",
		priceMonthly: 0,
		priceAnnually: 0,
		isPopular: false,
		buttonLabel: "Mulai Gratis",
		features: [
			{ key: "prd-3", name: "Hingga 3 PRD per bulan", isIncluded: true },
			{ key: "revisi-3", name: "Hingga 3 Revisi per bulan", isIncluded: true },
			{ key: "export-md", name: "Export ke Markdown", isIncluded: true },
			{
				key: "model-standar",
				name: "Akses Model Standar (Llama 3.1)",
				isIncluded: true,
			},
			{ key: "prd-25", name: "Hingga 25 PRD per bulan", isIncluded: false },
			{
				key: "revisi-20",
				name: "Hingga 20 Revisi per bulan",
				isIncluded: false,
			},
			{
				key: "model-pro",
				name: "Akses Model Pro (Claude Sonnet, Gemini Flash, Kimi)",
				isIncluded: false,
			},
			{ key: "share", name: "Bagikan PRD (Share Link)", isIncluded: false },
			{ key: "version-30", name: "Riwayat Versi (30 hari)", isIncluded: false },
			{ key: "prd-unlimited", name: "PRD Tak Terbatas", isIncluded: false },
			{
				key: "revisi-unlimited",
				name: "Revisi Tak Terbatas",
				isIncluded: false,
			},
			{
				key: "model-hengker",
				name: "Akses Model Hengker (GPT 5.5, Claude Opus, Deepseek v4)",
				isIncluded: false,
			},
			{
				key: "version-unlimited",
				name: "Riwayat Versi Tak Terbatas",
				isIncluded: false,
			},
			{ key: "priority", name: "Antrean Prioritas", isIncluded: false },
		],
	},
	{
		id: "pro",
		name: "Pro",
		description: "Untuk Product Manager dan tim yang butuh kecepatan.",
		priceMonthly: 25000,
		priceAnnually: 240000,
		isPopular: true,
		buttonLabel: "Pilih Pro",
		features: [
			{ key: "prd-3", name: "Hingga 3 PRD per bulan", isIncluded: true },
			{ key: "revisi-3", name: "Hingga 3 Revisi per bulan", isIncluded: true },
			{ key: "export-md", name: "Export ke Markdown", isIncluded: true },
			{
				key: "model-standar",
				name: "Akses Model Standar (Llama 3.1)",
				isIncluded: true,
			},
			{ key: "prd-25", name: "Hingga 25 PRD per bulan", isIncluded: true },
			{
				key: "revisi-20",
				name: "Hingga 20 Revisi per bulan",
				isIncluded: true,
			},
			{
				key: "model-pro",
				name: "Akses Model Pro (Claude Sonnet, Gemini Flash, Kimi)",
				isIncluded: true,
			},
			{ key: "share", name: "Bagikan PRD (Share Link)", isIncluded: true },
			{ key: "version-30", name: "Riwayat Versi (30 hari)", isIncluded: true },
			{ key: "prd-unlimited", name: "PRD Tak Terbatas", isIncluded: false },
			{
				key: "revisi-unlimited",
				name: "Revisi Tak Terbatas",
				isIncluded: false,
			},
			{
				key: "model-hengker",
				name: "Akses Model Hengker (GPT 5.5, Claude Opus, Deepseek v4)",
				isIncluded: false,
			},
			{
				key: "version-unlimited",
				name: "Riwayat Versi Tak Terbatas",
				isIncluded: false,
			},
			{ key: "priority", name: "Antrean Prioritas", isIncluded: false },
		],
	},
	{
		id: "hengker",
		name: "Hengker",
		description: "Fitur penuh untuk para profesional.",
		priceMonthly: 75000,
		priceAnnually: 720000,
		isPopular: false,
		buttonLabel: "Pilih Hengker",
		features: [
			{ key: "prd-3", name: "Hingga 3 PRD per bulan", isIncluded: true },
			{ key: "revisi-3", name: "Hingga 3 Revisi per bulan", isIncluded: true },
			{ key: "export-md", name: "Export ke Markdown", isIncluded: true },
			{
				key: "model-standar",
				name: "Akses Model Standar (Llama 3.1)",
				isIncluded: true,
			},
			{ key: "prd-25", name: "Hingga 25 PRD per bulan", isIncluded: true },
			{
				key: "revisi-20",
				name: "Hingga 20 Revisi per bulan",
				isIncluded: true,
			},
			{
				key: "model-pro",
				name: "Akses Model Pro (Claude Sonnet, Gemini Flash, Kimi)",
				isIncluded: true,
			},
			{ key: "share", name: "Bagikan PRD (Share Link)", isIncluded: true },
			{ key: "version-30", name: "Riwayat Versi (30 hari)", isIncluded: true },
			{ key: "prd-unlimited", name: "PRD Tak Terbatas", isIncluded: true },
			{
				key: "revisi-unlimited",
				name: "Revisi Tak Terbatas",
				isIncluded: true,
			},
			{
				key: "model-hengker",
				name: "Akses Model Hengker (GPT 5.5, Claude Opus, Deepseek v4)",
				isIncluded: true,
			},
			{
				key: "version-unlimited",
				name: "Riwayat Versi Tak Terbatas",
				isIncluded: true,
			},
			{ key: "priority", name: "Antrean Prioritas", isIncluded: true },
		],
	},
];
