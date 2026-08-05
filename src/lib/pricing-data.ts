export interface Feature {
	key: string;
	name: string;
	isIncluded: boolean;
	tooltip?: string;
}

export interface PriceTier {
	id: "free" | "pro" | "hengker";
	name: string;
	description: string;
	/** One-time price in IDR. Credits never expire, no billing cycle. */
	price: number;
	credits: number;
	isPopular: boolean;
	buttonLabel: string;
	features: Feature[];
}

/**
 * Shared row order so the comparison table lines up across tiers.
 * Model names mirror src/lib/model-config.ts - keep them in sync.
 */
const FEATURE_ROWS = [
	{ key: "prd", name: "Generate PRD" },
	{ key: "revisi", name: "Revisi tanpa batas" },
	{ key: "export-md", name: "Export ke Markdown" },
	{ key: "model-free", name: "Model Free (Ling 3.0 Flash, Big Pickle)" },
	{ key: "workflow", name: "Full workflow (AC + Task + Kanban)" },
	{ key: "model-pro", name: "Model Pro (Nemotron 3 Ultra, MiMo v2.5)" },
	{ key: "share", name: "Bagikan PRD (Share Link)" },
	{ key: "version-30", name: "Riwayat 30 versi" },
	{ key: "model-hengker", name: "Model Hengker (DeepSeek v4 Flash)" },
	{ key: "version-unlimited", name: "Riwayat versi tak terbatas" },
	{ key: "priority", name: "Antrean prioritas" },
] as const;

function buildFeatures(included: readonly string[]): Feature[] {
	return FEATURE_ROWS.map((row) => ({
		key: row.key,
		name: row.name,
		isIncluded: included.includes(row.key),
	}));
}

export const novaPlanPlans: [PriceTier, PriceTier, PriceTier] = [
	{
		id: "free",
		name: "Free",
		description: "Coba NovaPlan dengan 2 kredit sekali pakai.",
		price: 0,
		credits: 2,
		isPopular: false,
		buttonLabel: "Mulai Gratis",
		features: buildFeatures(["prd", "revisi", "export-md", "model-free"]),
	},
	{
		id: "pro",
		name: "Pro",
		description: "10 kredit, full workflow dari PRD sampai Kanban.",
		price: 49000,
		credits: 10,
		isPopular: true,
		buttonLabel: "Beli Pro",
		features: buildFeatures([
			"prd",
			"revisi",
			"export-md",
			"model-free",
			"workflow",
			"model-pro",
			"share",
			"version-30",
		]),
	},
	{
		id: "hengker",
		name: "Hengker",
		description: "35 kredit, model premium, dan antrean prioritas.",
		price: 149000,
		credits: 35,
		isPopular: false,
		buttonLabel: "Beli Hengker",
		features: buildFeatures(FEATURE_ROWS.map((row) => row.key)),
	},
];
