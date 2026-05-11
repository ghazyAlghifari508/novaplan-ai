"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface SettingsClientProps {
  profile: unknown;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profil" },
  { href: "/settings/account", label: "Akun" },
  { href: "/settings/notifications", label: "Notifikasi" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api", label: "API Keys" },
  { href: "/settings/templates", label: "Templates" },
  { href: "/settings/feedback", label: "Feedback" },
];

export const SettingsClient = memo(function SettingsClient({
  children,
}: SettingsClientProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-[1280px] gap-8 px-6 py-8">
      <nav className="w-56 shrink-0 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary-black text-white"
                : "text-text-gray hover:bg-light-gray-bg hover:text-primary-black",
            )}
          >
            {item.label}
          </Link>
        ))}

        <hr className="my-4 border-border-subtle" />

        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-text-gray hover:text-primary-black">
          ← Dashboard
        </Link>
      </nav>

      <div className="flex-1">{children}</div>
    </div>
  );
});