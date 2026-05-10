"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email! } : null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 shadow-sm backdrop-blur-xl"
          : "bg-transparent backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-[120px] py-4 max-md:px-6">
        <Link
          href="/"
          className={cn(
            "text-2xl font-semibold tracking-[-1.44px] transition-colors",
            "font-schibsted",
            scrolled ? "text-primary-black" : "text-white",
          )}
        >
          NovaPlan
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className={cn(
              "text-base font-medium tracking-[-0.2px] transition-colors hover:opacity-80",
              scrolled ? "text-text-gray" : "text-white/80",
            )}
          >
            Pricing
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className={cn(
                "text-base font-medium tracking-[-0.2px] transition-colors hover:opacity-80",
                scrolled ? "text-text-gray" : "text-white/80",
              )}
            >
              Dashboard
            </Link>
          ) : (
            <Link href="/login">
              <Button
                variant={scrolled ? "primary" : "transparent"}
                size="sm"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}