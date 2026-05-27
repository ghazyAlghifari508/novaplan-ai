"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

// --- 1. Typescript Interfaces (API) ---

type BillingCycle = 'monthly' | 'annually';

interface Feature {
  name: string;
  isIncluded: boolean;
  tooltip?: string;
}

interface PriceTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnually: number;
  isPopular: boolean;
  buttonLabel: string;
  features: Feature[];
}

interface PricingComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  plans: [PriceTier, PriceTier, PriceTier];
  billingCycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  onPlanSelect: (planId: string, cycle: BillingCycle) => void;
}

// --- 2. Utility Components ---

const FeatureItem: React.FC<{ feature: Feature }> = ({ feature }) => {
  const Icon = feature.isIncluded ? Check : X;
  const iconColor = feature.isIncluded ? "text-primary-black dark:text-[#F0F0F0]" : "text-border-subtle";

  return (
    <li className="flex items-start space-x-3 py-2">
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", iconColor)} aria-hidden="true" />
      <span className={cn("text-sm font-schibsted", feature.isIncluded ? "text-primary-black dark:text-[#F0F0F0]" : "text-text-gray dark:text-[#A0A0A0]/50")}>
        {feature.name}
      </span>
    </li>
  );
};

// --- 3. Main Component: PricingComponent ---

const PricingComponent: React.FC<PricingComponentProps> = ({
  plans,
  billingCycle,
  onCycleChange,
  onPlanSelect,
  className,
  ...props
}) => {
  if (plans.length !== 3) {
    console.error("PricingComponent requires exactly 3 pricing tiers.");
    return null;
  }

  const annualDiscountPercent = 20;

  const CycleToggle = (
    <div className="flex justify-center mb-10 mt-2 font-schibsted">
      <ToggleGroup
        type="single"
        value={billingCycle}
        onValueChange={(value) => {
          if (value && (value === 'monthly' || value === 'annually')) {
            onCycleChange(value);
          }
        }}
        aria-label="Select billing cycle"
        className="border border-border-subtle dark:border-white/10 rounded-lg p-1 bg-light-gray-bg dark:bg-[#161616]"
      >
        <ToggleGroupItem
          value="monthly"
          aria-label="Monthly Billing"
          className="px-6 py-1.5 text-sm font-medium data-[state=on]:bg-white dark:bg-[#1E1E1E] data-[state=on]:shadow-sm data-[state=on]:border-border-subtle dark:border-white/10 data-[state=on]:ring-1 data-[state=on]:ring-black/5 rounded-md transition-colors"
        >
          Bulanan
        </ToggleGroupItem>
        <ToggleGroupItem
          value="annually"
          aria-label="Annual Billing"
          className="px-6 py-1.5 text-sm font-medium data-[state=on]:bg-white dark:bg-[#1E1E1E] data-[state=on]:shadow-sm data-[state=on]:border-border-subtle dark:border-white/10 data-[state=on]:ring-1 data-[state=on]:ring-black/5 rounded-md transition-colors relative"
        >
          Tahunan
          <span className="absolute -top-3 right-0 text-xs font-semibold text-primary-black dark:text-[#F0F0F0] bg-accent-green px-1.5 rounded-full whitespace-nowrap">
            Hemat {annualDiscountPercent}%
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  const allFeatures = Array.from(new Set(plans.flatMap(p => p.features.map(f => f.name))));
  
  const PricingCards = (
    <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
      {plans.map((plan) => {
        const isFeatured = plan.isPopular;
        const currentPrice = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnually;
        const originalMonthlyPrice = plan.priceMonthly;
        const priceSuffix = billingCycle === 'monthly' ? '/bln' : '/thn';
        
        const formatIdr = (num: number) => num.toLocaleString('id-ID');

        return (
          <Card
            key={plan.id}
            className={cn(
              "flex flex-col transition-all duration-300 shadow-md hover:shadow-lg",
              isFeatured && "ring-2 ring-primary-black shadow-xl transform md:scale-[1.02] hover:scale-[1.04]"
            )}
          >
            <CardHeader className="p-6 pb-4 relative">
              {isFeatured && (
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--btn-bg)] rounded-t-lg"></div>
              )}
              <div className="flex justify-between items-start mt-2">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                {isFeatured && (
                  <span className="text-xs font-semibold px-3 py-1 bg-accent-green text-primary-black dark:text-[#F0F0F0] rounded-full font-schibsted">
                    Paling Laris
                  </span>
                )}
              </div>
              <CardDescription className="text-sm mt-1">{plan.description}</CardDescription>
              <div className="mt-4 font-schibsted">
                <p className="text-4xl font-extrabold text-primary-black dark:text-[#F0F0F0]">
                  {currentPrice === 0 ? "Gratis" : `Rp ${formatIdr(currentPrice)}`}
                  {currentPrice !== 0 && <span className="text-base font-normal text-text-gray dark:text-[#A0A0A0] ml-1">{priceSuffix}</span>}
                </p>
                {billingCycle === 'annually' && currentPrice > 0 && (
                  <p className="text-xs text-text-gray dark:text-[#A0A0A0] mt-1 font-medium">
                    Ditagih tahunan (Rp {formatIdr(plan.priceAnnually)})
                  </p>
                )}
                {billingCycle === 'annually' && currentPrice > 0 && (
                    <p className="text-xs text-text-gray dark:text-[#A0A0A0] line-through opacity-70 mt-1">
                        Rp {formatIdr(originalMonthlyPrice)}/bln
                    </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-0">
              <h4 className="text-sm font-semibold mb-2 mt-4 text-primary-black dark:text-[#F0F0F0] font-fustat">Fitur Utama:</h4>
              <ul className="list-none space-y-0">
                {plan.features.slice(0, 5).map((feature) => (
                  <FeatureItem key={feature.name} feature={feature} />
                ))}
                {plan.features.length > 5 && (
                    <li className="text-sm text-text-gray dark:text-[#A0A0A0] mt-2 font-schibsted">
                        + {plan.features.length - 5} fitur lainnya
                    </li>
                )}
              </ul>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                onClick={() => onPlanSelect(plan.id, billingCycle)}
                className={cn(
                  "w-full transition-all duration-200 font-schibsted font-bold",
                  isFeatured
                    ? "bg-[var(--btn-bg)] hover:bg-[var(--btn-bg)]/90 text-[var(--btn-text)] shadow-lg shadow-black/20"
                    : "bg-white dark:bg-[#1E1E1E] text-primary-black dark:text-[#F0F0F0] hover:bg-light-gray-bg dark:bg-[#161616] border border-border-subtle dark:border-white/10"
                )}
                size="lg"
                aria-label={`Pilih paket ${plan.name}`}
              >
                {plan.buttonLabel}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  const ComparisonTable = (
    <div className="mt-16 hidden md:block border border-border-subtle dark:border-white/10 rounded-lg overflow-x-auto shadow-sm">
      <table className="min-w-full divide-y divide-border-subtle">
        <thead>
          <tr className="bg-light-gray-bg dark:bg-[#161616]">
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-primary-black dark:text-[#F0F0F0] font-fustat w-[200px] whitespace-nowrap">
              Fitur Lengkap
            </th>
            {plans.map((plan) => (
              <th
                key={`th-${plan.id}`}
                scope="col"
                className={cn(
                  "px-6 py-4 text-center text-sm font-semibold text-primary-black dark:text-[#F0F0F0] font-fustat whitespace-nowrap",
                  plan.isPopular && "bg-black/5"
                )}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-white dark:bg-[#1E1E1E] font-schibsted">
          {allFeatures.map((featureName, index) => (
            <tr key={featureName} className={cn("transition-colors hover:bg-light-gray-bg dark:bg-[#161616]", index % 2 === 0 ? "bg-white dark:bg-[#1E1E1E]" : "bg-black/5")}>
              <td className="px-6 py-3 text-left text-sm font-medium text-primary-black dark:text-[#F0F0F0] whitespace-nowrap">
                {featureName}
              </td>
              {plans.map((plan) => {
                const feature = plan.features.find(f => f.name === featureName);
                const isIncluded = feature?.isIncluded ?? false;
                const Icon = isIncluded ? Check : X;
                const iconColor = isIncluded ? "text-primary-black dark:text-[#F0F0F0]" : "text-border-subtle";

                return (
                  <td
                    key={`${plan.id}-${featureName}`}
                    className={cn(
                      "px-6 py-3 text-center transition-all duration-150",
                      plan.isPopular && "bg-black/5"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mx-auto", iconColor)} aria-hidden="true" />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={cn("w-full py-12 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)} {...props}>
      <header className="text-center mb-10">
        <h2 className="text-[48px] font-bold tracking-[-2px] text-primary-black dark:text-[#F0F0F0] font-fustat leading-tight max-md:text-[36px]">
          Pilih Paket yang Sesuai
        </h2>
        <p className="mt-3 text-[18px] text-text-gray dark:text-[#A0A0A0] max-w-2xl mx-auto font-schibsted leading-relaxed">
          Tingkatkan produktivitas tim Anda dengan dokumentasi produk yang lebih cepat dan terstruktur.
        </p>
      </header>
      
      {CycleToggle}
      
      <section aria-labelledby="pricing-plans">
        {PricingCards}
      </section>

      <section aria-label="Feature Comparison Table" className="mt-16">
        <h3 className="text-[48px] font-bold tracking-[-2px] leading-tight max-md:text-[36px] mb-6 hidden md:block text-center text-primary-black dark:text-[#F0F0F0] font-fustat">
          Perbandingan Fitur
        </h3>
        {ComparisonTable}
      </section>
    </div>
  );
};

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

export default function PricingWrapper() {
  const [cycle, setCycle] = React.useState<BillingCycle>('annually');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const handleCycleChange = (newCycle: BillingCycle) => {
    setCycle(newCycle);
  };

  const handlePlanSelect = async (planId: string, currentCycle: BillingCycle) => {
    if (planId === 'free') {
      router.push('/');
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId, cycle: currentCycle })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/pricing');
        } else {
          alert(data.error || 'Terjadi kesalahan saat memproses pembayaran.');
        }
        return;
      }
      
      // Redirect to Midtrans snap
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PricingComponent
      plans={novaPlanPlans}
      billingCycle={cycle}
      onCycleChange={handleCycleChange}
      onPlanSelect={handlePlanSelect}
    />
  );
}
