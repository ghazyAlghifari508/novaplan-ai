"use client";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, MessageSquare } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
] as const;

export const AdminClient = memo(function AdminClient({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  return (
    <div className="flex min-h-screen flex-col bg-onyx text-snow md:flex-row">
      <aside className="left-0 top-0 z-40 flex w-full shrink-0 flex-col border-b border-graphite bg-charcoal font-inter md:fixed md:bottom-0 md:w-64 md:border-r">
        <div className="p-4 md:p-8 md:pb-4">
          <h1 className="text-xl font-light text-snow md:text-2xl">Admin</h1>
          <p className="mt-1 text-xs text-fog md:text-sm">Kelola pengguna & laporan</p>
        </div>
        <nav className="flex md:flex-1 md:flex-col flex-row gap-2 md:space-y-1.5 px-4 pb-4 md:pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar items-center md:items-stretch">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname === `${item.href}/`;
            return (
              <Link key={item.href} to={item.href} className={cn("flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-[510] transition-all duration-300 md:gap-3 md:px-4 md:py-3 md:text-[15px]", isActive ? "bg-obsidian text-snow shadow-[var(--shadow-inset)]" : "text-fog hover:bg-white/5 hover:text-snow")}>
                <Icon size={18} className={isActive ? "text-mist" : "text-fog"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 md:ml-64 p-4 sm:p-8 lg:p-12 w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
});
