"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { User, Shield, Bell, CreditCard, Key, LayoutTemplate, MessageSquare, ArrowLeft } from "lucide-react";

interface SettingsClientProps {
  profile: unknown;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profil", icon: User },
  { href: "/settings/account", label: "Akun", icon: Shield },
  { href: "/settings/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/api", label: "API Keys", icon: Key },
  { href: "/settings/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings/feedback", label: "Feedback", icon: MessageSquare },
];

export const SettingsClient = memo(function SettingsClient({
  children,
}: SettingsClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-surface)" }}>
      {/* Sidebar - fixed on the left, full height */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-64 shrink-0 border-r border-[var(--border-subtle)] flex flex-col font-schibsted z-40"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Manage account preferences</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/settings" && pathname === "/settings");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200",
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

          <div className="my-6 h-px w-full" style={{ background: "var(--border-subtle)" }} />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={18} style={{ color: "var(--text-muted)" }} />
            Back to Workspace
          </Link>
        </nav>
      </aside>

      {/* Main Content - Pushed to the right of the sidebar */}
      <main className="flex-1 ml-64 p-8 lg:p-12">
        <div className="w-full [&>div]:min-h-[calc(100vh-6rem)]">
          {children}
        </div>
      </main>
    </div>
  );
});