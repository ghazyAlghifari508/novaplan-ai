import { Suspense } from "react";
import { SetupClient } from "./setup-client";
import { requireAuth } from "@/lib/auth";
import { GridBackground } from "@/components/layout";

export const metadata = {
  title: "Setup PRD - NovaPlan",
};

export default async function SetupPage() {
  await requireAuth();

  return (
    <main className="flex flex-col min-h-screen bg-onyx">
      <section
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden pb-20 pt-16"
        style={{ background: "var(--bg-page)" }}
      >
        <GridBackground />

        <div className="relative z-10 flex w-full flex-col items-center">
          <Suspense fallback={<div className="font-inter text-fog">Loading...</div>}>
            <SetupClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
