"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { User, Shield, Bell, CreditCard, MessageSquare, ArrowLeft } from "lucide-react";

interface SettingsClientProps {
  profile: unknown;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profil", icon: User },
  { href: "/settings/account", label: "Akun", icon: Shield },
  { href: "/settings/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/feedback", label: "Feedback", icon: MessageSquare },
];

export const SettingsClient = memo(function SettingsClient({
  children,
}: SettingsClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: "var(--bg-surface)" }}>
      {/* Sidebar - fixed on the left for desktop, top for mobile */}
      <aside
        className="md:fixed left-0 top-0 md:bottom-0 w-full md:w-64 shrink-0 md:border-r border-b border-[var(--border-subtle)] flex flex-col font-schibsted z-40"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div className="p-4 md:p-8 md:pb-4 flex justify-between items-center md:block">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
            <p className="mt-1 text-xs md:text-sm" style={{ color: "var(--text-secondary)" }}>Manage account preferences</p>
          </div>
          <Link
            href="/"
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-black/5 dark:bg-white/5 text-text-gray"
          >
            <ArrowLeft size={20} />
          </Link>
        </div>

        <nav className="flex md:flex-1 md:flex-col flex-row gap-2 md:space-y-1.5 px-4 pb-4 md:pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar items-center md:items-stretch">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/settings" && pathname === "/settings");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 md:gap-3 rounded-xl px-3 md:px-4 py-2 md:py-3 text-[13px] md:text-[15px] font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-[var(--btn-bg)] shadow-md"
                    : "hover:bg-[var(--bg-hover)]"
                )}
                style={{
                  color: isActive ? "var(--btn-text)" : "var(--text-secondary)",
                }}
              >
                <Icon
                  size={18}
                  style={{
                    color: isActive ? "var(--btn-text)" : "var(--text-muted)",
                  }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="hidden md:block my-6 h-px w-full" style={{ background: "var(--border-subtle)" }} />

          <Link
            href="/"
            className="hidden md:flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={18} style={{ color: "var(--text-muted)" }} />
            Back to Workspace
          </Link>
        </nav>
      </aside>

      {/* Main Content - Pushed to the right of the sidebar on desktop */}
      <main className="flex-1 md:ml-64 p-4 sm:p-8 lg:p-12 w-full max-w-[100vw] overflow-x-hidden">
        <div className="w-full [&>div]:min-h-[calc(100vh-6rem)]">
          {children}
        </div>
      </main>
    </div>
  );
});