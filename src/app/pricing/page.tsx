import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import PricingWrapper from "@/components/ui/pricing-card";

export const metadata = {
  title: "Pricing | NovaPlan",
  description: "Pilih paket yang sesuai untuk kebutuhan PRD otomatis tim Anda.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#1E1E1E]">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <PricingWrapper />
      </main>
      <Footer />
    </div>
  );
}