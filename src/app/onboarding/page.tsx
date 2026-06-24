import { OnboardingForm } from "@/components/auth";
import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Link href="/" className="font-inter text-2xl font-semibold tracking-tight">
          NovaPlan
        </Link>
      </div>
      <OnboardingForm />
    </div>
  );
}