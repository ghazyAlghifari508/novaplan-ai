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
      className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border-subtle)]"
      style={{ background: "var(--navbar-bg)", backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-[120px] py-[16px] max-md:px-6">
        <Link
          href="/"
          className="font-schibsted text-[24px] font-semibold tracking-[-1.44px]"
          style={{ color: "var(--text-primary)" }}
        >
          NovaPlan
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isLoading ? (
            <div className="flex items-center gap-2 sm:gap-3 ml-1">
              <div className="h-[36px] sm:h-[40px] w-[60px] sm:w-[82px] rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
              <div className="h-[36px] sm:h-[40px] w-[80px] sm:w-[101px] rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
            </div>
          ) : !user ? (
            <>
              <Link
                href="/register"
                className="flex h-[36px] sm:h-[40px] px-3 sm:px-4 items-center justify-center rounded-lg bg-transparent font-schibsted text-[14px] sm:text-[16px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--text-primary)" }}
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="flex h-[36px] sm:h-[40px] px-4 sm:px-6 items-center justify-center rounded-lg btn-primary font-schibsted text-[14px] sm:text-[16px] font-medium hover:opacity-90 transition-opacity"
              >
                Log In
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/prd"
                className="flex h-[36px] sm:h-[40px] px-4 sm:px-6 items-center justify-center rounded-lg btn-primary font-schibsted text-[14px] sm:text-[16px] font-medium hover:opacity-90 transition-opacity"
              >
                Workspace
              </Link>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-[36px] w-[36px] sm:h-[40px] sm:w-[40px] items-center justify-center rounded-full transition-colors border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                  style={{ background: "var(--bg-hover)" }}
                >
                  <User size={20} style={{ color: "var(--text-secondary)" }} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border-subtle)] py-2 shadow-lg z-50 flex flex-col font-schibsted"
                      style={{ background: "var(--dropdown-bg)" }}
                    >
                      <div className="px-4 py-2 mb-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {user?.email}
                        </p>
                      </div>
                      <div
                        className="h-px w-full mb-1"
                        style={{ background: "var(--border-subtle)" }}
                      />
                      <Link
                        href="/settings/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Settings size={18} style={{ color: "var(--text-muted)" }} />
                        Profile / Setting
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <CreditCard size={18} style={{ color: "var(--text-muted)" }} />
                        Pricing
                      </Link>
                      <div
                        className="my-1 h-px w-full"
                        style={{ background: "var(--border-subtle)" }}
                      />
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <LogOut size={18} />
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
