import { Suspense } from "react";
import { ManualSetupClient } from "./manual-setup-client";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Detail PRD - NovaPlan",
};

export default async function ManualSetupPage() {
  await requireAuth();

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full justify-center bg-light-gray-bg py-16">
      <Suspense fallback={<div>Loading...</div>}>
        <ManualSetupClient />
      </Suspense>
    </div>
  );
}
