import { Suspense } from "react";
import { SetupClient } from "./setup-client";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Setup PRD - NovaPlan",
};

export default async function SetupPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-light-gray-bg dark:bg-[#161616] pt-16">
      <Suspense fallback={<div>Loading...</div>}>
        <SetupClient />
      </Suspense>
    </div>
  );
}
