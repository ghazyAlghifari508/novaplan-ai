import { Suspense } from "react";
import { ManualSetupClient } from "./manual-setup-client";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Detail PRD - NovaPlan",
};

export default async function ManualSetupPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen w-full justify-center bg-light-gray-bg dark:bg-[#161616] py-16">
      <Suspense fallback={<div>Loading...</div>}>
        <ManualSetupClient />
      </Suspense>
    </div>
  );
}
