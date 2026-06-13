"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

// --- 1. Typescript Interfaces (API) ---

import { type BillingCycle, type Feature, type PriceTier, novaPlanPlans } from '@/lib/pricing-data';

interface PricingComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  plans: [PriceTier, PriceTier, PriceTier];
  billingCycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  onPlanSelect: (planId: string, cycle: BillingCycle) => void;
  currentPlan?: string;
}

// --- 2. Utility Components ---

const FeatureItem: React.FC<{ feature: Feature }> = ({ feature }) => {
  const Icon = feature.isIncluded ? Check : X;
  const iconColor = feature.isIncluded ? "text-mist" : "text-slate/60";

  return (
    <li className="flex items-start space-x-3 py-2">
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", iconColor)} aria-hidden="true" />
      <span className={cn("font-inter text-sm", feature.isIncluded ? "text-mist" : "text-slate")}>
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
  currentPlan = 'free',
  className,
  ...props
}) => {
  if (plans.length !== 3) {
    console.error("PricingComponent requires exactly 3 pricing tiers.");
    return null;
  }

  const annualDiscountPercent = 20;

  const CycleToggle = (
    <div className="mb-10 mt-6 flex justify-center font-inter">
      <div className="flex items-center gap-1 rounded-md bg-charcoal p-1 shadow-[var(--shadow-inset)]">
        <button
          onClick={() => onCycleChange('monthly')}
          aria-label="Monthly Billing"
          className={cn(
            "rounded px-6 py-1.5 text-sm font-[510] transition-colors",
            billingCycle === 'monthly'
              ? "bg-steel text-snow"
              : "text-fog hover:text-snow"
          )}
        >
          Bulanan
        </button>
        <button
          onClick={() => onCycleChange('annually')}
          aria-label="Annual Billing"
          className={cn(
            "relative rounded px-6 py-1.5 text-sm font-[510] transition-colors",
            billingCycle === 'annually'
              ? "bg-steel text-snow"
              : "text-fog hover:text-snow"
          )}
        >
          Tahunan
          <span className="absolute -top-6 right-0 whitespace-nowrap rounded-[4px] bg-indigo/20 px-2 py-0.5 text-xs font-[510] text-mist shadow-[inset_0_0_0_1px_rgba(94,106,210,0.45)]">
            Hemat {annualDiscountPercent}%
          </span>
        </button>
      </div>
    </div>
  );

  const allFeatures = Array.from(new Set(plans.flatMap(p => p.features.map(f => f.name))));
  
  const PricingCards = (
    <div className="grid gap-6 md:grid-cols-3">
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
              "flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1",
              isFeatured && "shadow-[inset_0_0_0_1px_rgba(94,106,210,0.8),var(--shadow-linear-xl)] md:scale-[1.02]"
            )}
          >
            <CardHeader className="p-6 pb-4 relative">
              {isFeatured && (
                <div className="absolute left-0 top-0 h-1 w-full rounded-t-xl bg-indigo"></div>
              )}
              <div className="flex justify-between items-start mt-2">
                <CardTitle className="text-2xl font-normal">{plan.name}</CardTitle>
                {isFeatured && (
                  <span className="rounded-[2px] bg-indigo/20 px-3 py-1 font-inter text-xs font-[510] text-mist shadow-[inset_0_0_0_1px_rgba(94,106,210,0.45)]">
                    Paling Laris
                  </span>
                )}
              </div>
              <CardDescription className="text-sm mt-1">{plan.description}</CardDescription>
              <div className="mt-4 font-inter">
                <p className="text-4xl font-light text-snow">
                  {currentPrice === 0 ? "Gratis" : `Rp ${formatIdr(currentPrice)}`}
                  {currentPrice !== 0 && <span className="ml-1 text-base font-normal text-fog">{priceSuffix}</span>}
                </p>
                {billingCycle === 'annually' && currentPrice > 0 && (
                  <p className="mt-1 text-xs font-[510] text-fog">
                    Ditagih tahunan (Rp {formatIdr(plan.priceAnnually)})
                  </p>
                )}
                {billingCycle === 'annually' && currentPrice > 0 && (
                    <p className="mt-1 text-xs text-slate line-through">
                        Rp {formatIdr(originalMonthlyPrice)}/bln
                    </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-0">
              <h4 className="mb-2 mt-4 font-inter text-sm font-[510] text-snow">Fitur Utama:</h4>
              <ul className="list-none space-y-0">
                {plan.features.slice(0, 5).map((feature) => (
                  <FeatureItem key={feature.name} feature={feature} />
                ))}
                {plan.features.length > 5 && (
                    <li className="mt-2 font-inter text-sm text-fog">
                        + {plan.features.length - 5} fitur lainnya
                    </li>
                )}
              </ul>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              {(() => {
                const planHierarchy = { free: 0, pro: 1, hengker: 2 };
                const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] ?? 0;
                const cardLevel = planHierarchy[plan.id as keyof typeof planHierarchy] ?? 0;

                const isCurrentPlan = currentPlan === plan.id;
                const isDowngrade = cardLevel < currentLevel;
                const isUpgrade = cardLevel > currentLevel;
                const isFreeCard = plan.id === 'free';

                let buttonLabel = plan.buttonLabel;
                let isDisabled = false;

                if (isCurrentPlan) {
                  buttonLabel = 'Plan Aktif';
                  isDisabled = true;
                } else if (isDowngrade || (isFreeCard && currentLevel > 0)) {
                  buttonLabel = 'Plan Aktif: ' + currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
                  isDisabled = true;
                } else if (isUpgrade) {
                  buttonLabel = `Upgrade ke ${plan.name}`;
                }

                return (
                  <Button
                    onClick={() => !isDisabled && onPlanSelect(plan.id, billingCycle)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full font-inter font-[510] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer",
                      isFeatured && !isDisabled
                          ? "btn-primary hover:brightness-105"
                        : !isDisabled
                          ? "border border-snow/70 bg-transparent text-snow hover:bg-white/5"
                          : "bg-steel/30 text-slate"
                    )}
                    size="lg"
                    aria-label={`Pilih paket ${plan.name}`}
                  >
                    {buttonLabel}
                  </Button>
                );
              })()}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  const ComparisonTable = (
    <div className="mt-16 hidden overflow-x-auto rounded-xl bg-obsidian shadow-[var(--shadow-inset)] md:block">
      <table className="min-w-full divide-y divide-graphite">
        <thead>
          <tr className="bg-charcoal">
            <th scope="col" className="w-[200px] whitespace-nowrap px-6 py-4 text-left font-inter text-sm font-[510] text-snow">
              Fitur Lengkap
            </th>
            {plans.map((plan) => (
              <th
                key={`th-${plan.id}`}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-6 py-4 text-center font-inter text-sm font-[510] text-snow",
                  plan.isPopular && "bg-indigo/10"
                )}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-graphite bg-obsidian font-inter">
          {allFeatures.map((featureName, index) => (
            <tr key={featureName} className={cn("transition-colors hover:bg-white/5", index % 2 === 0 ? "bg-obsidian" : "bg-charcoal/60")}>
              <td className="whitespace-nowrap px-6 py-3 text-left text-sm font-[510] text-mist">
                {featureName}
              </td>
              {plans.map((plan) => {
                const feature = plan.features.find(f => f.name === featureName);
                const isIncluded = feature?.isIncluded ?? false;
                const Icon = isIncluded ? Check : X;
                const iconColor = isIncluded ? "text-mist" : "text-slate/60";

                return (
                  <td
                    key={`${plan.id}-${featureName}`}
                    className={cn(
                      "px-6 py-3 text-center transition-all duration-150",
                      plan.isPopular && "bg-indigo/10"
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
    <div className={cn("mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 md:py-20 lg:px-8", className)} {...props}>
      <header className="text-center mb-10">
        <h2 className="font-inter text-[40px] font-light leading-tight text-snow max-md:text-[36px] md:text-[48px]">
          Pilih Paket yang Sesuai
        </h2>
        <p className="mx-auto mt-3 max-w-2xl font-inter text-[17px] leading-relaxed text-fog">
          Tingkatkan produktivitas tim Anda dengan dokumentasi produk yang lebih cepat dan terstruktur.
        </p>
      </header>
      
      {CycleToggle}
      
      <section aria-labelledby="pricing-plans">
        {PricingCards}
      </section>

      <section aria-label="Feature Comparison Table" className="mt-16">
        <h3 className="mb-6 hidden text-center font-inter text-[48px] font-light leading-tight text-snow max-md:text-[36px] md:block">
          Perbandingan Fitur
        </h3>
        {ComparisonTable}
      </section>
    </div>
  );
};

import { useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store';
import { syncPaymentStatus } from '@/app/actions/payment';

export default function PricingWrapper() {
  const [cycle, setCycle] = React.useState<BillingCycle>('annually');
  const [currentPlan, setCurrentPlan] = React.useState<string>('free');
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useUIStore(state => state.showToast);

  // Fetch current plan on mount
  React.useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch('/api/user/plan');
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan || 'free');
        }
      } catch {
        // Not logged in or error — default to free
      }
    };
    fetchPlan();
  }, []);

  // Sync payment status when redirected back from Midtrans
  React.useEffect(() => {
    const orderId = searchParams.get('order_id');
    const payment = searchParams.get('payment');
    const txStatus = searchParams.get('transaction_status');

    if (orderId && (payment === 'success' || txStatus === 'settlement' || txStatus === 'capture')) {
      const sync = async () => {
        try {
          const res = await syncPaymentStatus(orderId);
          if (res.success && res.plan) {
            setCurrentPlan(res.plan);
            showToast(`Berhasil upgrade ke paket ${res.plan.charAt(0).toUpperCase() + res.plan.slice(1)}! Nikmati fitur premium Anda.`, 'success');
            router.replace('/pricing');
          }
        } catch (e) {
          console.error('Gagal sinkronisasi pembayaran:', e);
        }
      };
      sync();
    }
  }, [searchParams, showToast, router]);

  const handleCycleChange = (newCycle: BillingCycle) => {
    setCycle(newCycle);
  };

  const handlePlanSelect = async (planId: string, currentCycle: BillingCycle) => {
    if (planId === 'free') {
      router.push('/');
      return;
    }
    
    try {
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
          showToast(data.error || 'Terjadi kesalahan saat memproses pembayaran.', 'error');
        }
        return;
      }
      
      // Redirect to Midtrans snap
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e: unknown) {
      console.error(e);
      showToast('Gagal menghubungi server.', 'error');
    }
  };

  return (
    <PricingComponent
      plans={novaPlanPlans}
      billingCycle={cycle}
      onCycleChange={handleCycleChange}
      onPlanSelect={handlePlanSelect}
      currentPlan={currentPlan}
    />
  );
}
