
import { Footer } from "@/components/layout/footer";
import PricingWrapper from "@/components/ui/pricing-card";
import { Suspense } from "react";

export const metadata = {
  title: "Pricing | NovaPlan",
  description: "Pilih paket yang sesuai untuk kebutuhan PRD otomatis tim Anda.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-onyx">

      <main className="flex-grow pt-10 pb-12">
        <Suspense fallback={<div className="pt-10 text-center text-fog">Memuat paket...</div>}>
          <PricingWrapper />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
