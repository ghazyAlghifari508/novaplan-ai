"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchanged = useRef(false);

  useEffect(() => {
    async function handleExchange() {
      if (exchanged.current) return;
      exchanged.current = true;

      const insforgeCode = searchParams.get("insforge_code");
      const rawNext = searchParams.get("next") ?? "/";
      const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
      const error = searchParams.get("insforge_error") || searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        console.error("OAuth error:", errorDescription || error);
        router.replace(`/login?error=${encodeURIComponent(errorDescription || error || "auth_failed")}`);
        return;
      }

      if (insforgeCode) {
        const response = await fetch("/api/auth/oauth/callback", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: insforgeCode, next }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          console.error("OAuth exchange failed:", result?.message ?? response.statusText);
          router.replace(`/login?error=${encodeURIComponent(result?.error ?? "auth_failed")}`);
          return;
        }

        window.location.assign(result?.redirectTo ?? next);
      } else {
        // If no code and no error, just redirect to home
        window.location.assign(next);
      }
    }

    handleExchange();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Mengautentikasi...</p>
      </div>
    </div>
  );
}
