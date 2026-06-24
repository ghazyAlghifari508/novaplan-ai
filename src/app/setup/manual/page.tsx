import { Suspense } from "react";
import { ManualSetupClient } from "./manual-setup-client";
import { requireAuth } from "@/lib/auth";
import { GridBackground } from "@/components/layout";

export const metadata = {
  title: "Detail PRD - NovaPlan",
};

export default async function ManualSetupPage() {
  await requireAuth();

  return (
    <main className="flex flex-col min-h-screen bg-onyx">
      <section
        className="relative flex flex-1 flex-col items-center overflow-hidden py-16"
        style={{ background: "var(--bg-page)" }}
      >
        <GridBackground />

        <div className="relative z-10 flex w-full flex-col items-center">
          <Suspense fallback={<div className="font-inter text-fog">Loading...</div>}>
            <ManualSetupClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
