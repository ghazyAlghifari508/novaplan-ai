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
      { name: 'Model AI Standar (Llama)', isIncluded: true },
      { name: 'Export ke PDF & Notion', isIncluded: false },
      { name: 'Kolaborasi Tim', isIncluded: false },
      { name: 'Prioritas Support', isIncluded: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Untuk Product Manager dan tim yang butuh kecepatan.',
    priceMonthly: 49000,
    priceAnnually: 470000,
    isPopular: true,
    buttonLabel: 'Pilih Pro',
    features: [
      { name: 'Unlimited PRD', isIncluded: true },
      { name: 'Export ke Markdown', isIncluded: true },
      { name: 'Model AI Lanjutan (GPT-4o)', isIncluded: true },
      { name: 'Export ke PDF & Notion', isIncluded: true },
      { name: 'Kolaborasi Tim', isIncluded: false },
      { name: 'Prioritas Support', isIncluded: true },
    ],
  },
  {
    id: 'hengker',
    name: 'Hengker',
    description: 'Fitur penuh untuk perusahaan dan kolaborasi skala besar.',
    priceMonthly: 149000,
    priceAnnually: 1430000,
    isPopular: false,
    buttonLabel: 'Pilih Hengker',
    features: [
      { name: 'Unlimited PRD', isIncluded: true },
      { name: 'Export ke Markdown', isIncluded: true },
      { name: 'Model AI Custom', isIncluded: true },
      { name: 'Export ke PDF & Notion', isIncluded: true },
      { name: 'Kolaborasi Tim', isIncluded: true },
      { name: 'Prioritas Support (24/7)', isIncluded: true },
    ],
  },
];
