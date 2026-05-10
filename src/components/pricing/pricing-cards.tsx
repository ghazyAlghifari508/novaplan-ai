"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { SnapButton } from "./snap-button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";
import Link from "next/link";

interface Tier {
  plan: Plan;
  name: string;
  emoji: string;
  price: number;
  features: { text: string; included: boolean }[];
  cta: string;
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    plan: "free",
    name: "Gratis",
    emoji: "🆓",
    price: 0,
    cta: "Mulai Gratis",
    features: [
      { text: "3 PRD per bulan", included: true },
      { text: "3x revisi per PRD", included: true },
      { text: "Download .md", included: true },
      { text: "Download .pdf", included: false },
      { text: "Share link", included: false },
      { text: "Version history", included: false },
      { text: "Custom template", included: false },
      { text: "Priority AI queue", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    plan: "pro",
    name: "Pro",
    emoji: "⭐",
    price: 25000,
    popular: true,
    cta: "Pilih Pro",
    features: [
      { text: "25 PRD per bulan", included: true },
      { text: "20x revisi per PRD", included: true },
      { text: "Download .md", included: true },
      { text: "Download .pdf", included: true },
      { text: "Share link", included: true },
      { text: "Version history (30 hari)", included: true },
      { text: "Custom template", included: false },
      { text: "Priority AI queue", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    plan: "hengker",
    name: "Hengker",
    emoji: "🔥",
    price: 100000,
    cta: "Pilih Hengker",
    features: [
      { text: "PRD unlimited", included: true },
      { text: "Revisi unlimited", included: true },
      { text: "Download .md", included: true },
      { text: "Download .pdf", included: true },
      { text: "Share link", included: true },
      { text: "Version history (unlimited)", included: true },
      { text: "Custom template", included: true },
      { text: "Priority AI queue", included: true },
      { text: "API access", included: true },
    ],
  },
];

const TIERS_STATIC = TIERS;

export const PricingCards = memo(function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const isYearly = billing === "yearly";

  const getPrice = (tier: Tier) => {
    if (tier.price === 0) return 0;
    return isYearly ? Math.round(tier.price * 12 * 0.8) : tier.price;
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="font-fustat text-4xl font-bold">Pilih Plan</h1>
        <p className="mt-3 text-text-gray">
          Mulai gratis, upgrade kapan saja sesuai kebutuhan
        </p>

        <div className="mt-8 inline-flex rounded-xl bg-light-gray-bg p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-lg px-6 py-2 text-sm font-medium transition-all",
              billing === "monthly"
                ? "bg-white text-primary-black shadow-sm"
                : "text-text-gray",
            )}
          >
            Bulanan
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={cn(
              "rounded-lg px-6 py-2 text-sm font-medium transition-all",
              billing === "yearly"
                ? "bg-white text-primary-black shadow-sm"
                : "text-text-gray",
            )}
          >
            Tahunan
            <span className="ml-1.5 rounded bg-accent-green/20 px-1.5 py-0.5 text-xs text-green-800">
              -20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS_STATIC.map((tier) => (
          <div
            key={tier.plan}
            className={cn(
              "relative flex flex-col rounded-2xl border p-8 transition-all",
              tier.popular
                ? "border-primary-black shadow-lg scale-[1.02]"
                : "border-border-subtle",
            )}
          >
            {tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-black px-4 py-1 text-xs font-medium text-white">
                Paling Populer
              </span>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tier.emoji}</span>
                <h2 className="font-fustat text-xl font-bold">{tier.name}</h2>
              </div>
              <div className="mt-3">
                <span className="font-fustat text-4xl font-bold">
                  {tier.price === 0
                    ? "Gratis"
                    : formatCurrency(getPrice(tier))}
                </span>
                {tier.price > 0 && (
                  <span className="text-text-gray">
                    /{isYearly ? "tahun" : "bulan"}
                  </span>
                )}
              </div>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {f.included ? (
                    <svg
                      className="h-5 w-5 shrink-0 text-accent-green"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l3 3 7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 shrink-0 text-text-gray/25"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4l8 8M12 4l-8 8"
                      />
                    </svg>
                  )}
                  <span
                    className={cn(f.included ? "text-primary-black" : "text-text-gray/40")}
                  >
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {tier.plan === "free" ? (
              <Link href="/register">
                <Button size="lg" variant="secondary" className="w-full">
                  {tier.cta}
                </Button>
              </Link>
            ) : (
              <SnapButton
                plan={tier.plan}
                isYearly={isYearly}
                label={tier.cta}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});