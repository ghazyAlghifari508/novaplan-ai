"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, CreditCard, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const result = await response.json();
        if (result?.user?.id && result.user.email) {
          setUser({ id: result.user.id, email: result.user.email });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-40 h-14 border-b border-graphite bg-charcoal/95"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-inter text-[15px] font-[510] text-snow"
        >
          <span className="h-2 w-2 rounded-[2px] bg-snow shadow-[0_0_0_1px_var(--color-graphite)]" />
          NovaPlan
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="px-3 py-2 font-inter text-sm font-normal text-fog transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-snow"
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className="px-3 py-2 font-inter text-sm font-normal text-fog transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-snow"
          >
            Pricing
          </Link>
          <Link
            href="/prd"
            className="px-3 py-2 font-inter text-sm font-normal text-fog transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-snow"
          >
            Workspace
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isLoading ? (
            <div className="ml-1 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-[72px] animate-pulse rounded-md bg-white/5" />
              <div className="h-8 w-[84px] animate-pulse rounded-md bg-white/5" />
            </div>
          ) : !user ? (
            <>
              <Link
                href="/register"
                className="flex h-8 items-center justify-center rounded-full border border-snow/80 bg-transparent px-3.5 font-inter text-sm font-normal text-snow transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/5"
              >
                Register
              </Link>
              <Link
                href="/login"
                className="btn-primary flex h-8 items-center justify-center rounded-md px-4 font-inter text-sm font-[510] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[0.98]"
              >
                Log In
              </Link>
            </>
          ) : (
            <>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian text-fog shadow-[var(--shadow-inset)] transition-colors duration-300 hover:text-snow"
                >
                  <User size={16} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col overflow-hidden rounded-xl bg-obsidian py-2 font-inter shadow-[var(--shadow-overlay)]"
                    >
                      <div className="px-4 py-2 mb-1">
                        <p className="truncate text-sm font-[510] text-snow">
                          {user?.email}
                        </p>
                      </div>
                      <div className="mb-1 h-px w-full bg-graphite" />
                      <Link
                        href="/settings/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-[510] text-mist transition-colors hover:bg-white/5 hover:text-snow"
                      >
                        <Settings size={16} className="text-fog" />
                        Profile / Setting
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-[510] text-mist transition-colors hover:bg-white/5 hover:text-snow"
                      >
                        <CreditCard size={16} className="text-fog" />
                        Pricing
                      </Link>
                      <div className="my-1 h-px w-full bg-graphite" />
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-[510] text-crimson transition-colors hover:bg-crimson/10"
                      >
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
