import { Suspense } from "react";
import { SetupClient } from "./setup-client";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Setup PRD - NovaPlan",
};

export default async function SetupPage() {
  await requireAuth();

  return (
    <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-light-gray-bg pt-16">
      <Suspense fallback={<div>Loading...</div>}>
        <SetupClient />
      </Suspense>
    </div>
  );
}
