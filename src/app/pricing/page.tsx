import { Navbar } from "@/components/layout";
import { PricingCards } from "@/components/pricing";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <PricingCards />
    </main>
  );
}