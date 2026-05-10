"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createTransaction } from "@/app/actions/payment";
import { useUIStore } from "@/store";
import type { Plan } from "@/types/database";

declare global {
  interface Window {
    snap?: {
      pay: (token: string) => void;
    };
  }
}

interface SnapButtonProps {
  plan: Plan;
  isYearly: boolean;
  label?: string;
}

export function SnapButton({
  plan,
  isYearly,
  label = "Pilih Plan",
}: SnapButtonProps) {
  const [loading, setLoading] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  const handlePay = async () => {
    setLoading(true);

    try {
      const { token } = await createTransaction(plan, isYearly);

      if (!document.querySelector("#midtrans-snap")) {
        const script = document.createElement("script");
        script.id = "midtrans-snap";
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute(
          "data-client-key",
          process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX || "",
        );

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Midtrans"));
          document.head.appendChild(script);
        });
      }

      window.snap?.pay(token);
    } catch {
      showToast("Pembayaran gagal, coba lagi", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePay} isLoading={loading} size="lg" className="w-full">
      {label}
    </Button>
  );
}