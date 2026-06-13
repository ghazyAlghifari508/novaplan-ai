export type BillingCycle = 'monthly' | 'annually';

export interface Feature {
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
    id: 'free',
    name: 'Free',
    description: 'Cocok untuk pemula yang ingin mencoba NovaPlan.',
    priceMonthly: 0,
    priceAnnually: 0,
    isPopular: false,
    buttonLabel: 'Mulai Gratis',
    features: [
      { name: '3 PRD per bulan', isIncluded: true },
      { name: 'Export ke Markdown', isIncluded: true },
      { name: 'Akses Model Standar (Llama)', isIncluded: true },
      { name: 'Akses Model Pro & Hengker', isIncluded: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Untuk Product Manager dan tim yang butuh kecepatan.',
    priceMonthly: 25000,
    priceAnnually: 240000,
    isPopular: true,
    buttonLabel: 'Pilih Pro',
    features: [
      { name: 'Unlimited PRD', isIncluded: true },
      { name: 'Export ke Markdown', isIncluded: true },
      { name: 'Akses Model Pro (Claude Sonnet, Gemini Flash, Kimi)', isIncluded: true },
      { name: 'Akses Model Hengker', isIncluded: false },
    ],
  },
  {
    id: 'hengker',
    name: 'Hengker',
    description: 'Fitur penuh untuk para profesional.',
    priceMonthly: 75000,
    priceAnnually: 720000,
    isPopular: false,
    buttonLabel: 'Pilih Hengker',
    features: [
      { name: 'Unlimited PRD', isIncluded: true },
      { name: 'Export ke Markdown', isIncluded: true },
      { name: 'Semua Model Pro + Hengker (GPT 5.5, Claude Opus, Deepseek v4)', isIncluded: true },
    ],
  },
];
