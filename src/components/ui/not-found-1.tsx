"use client";

import { ArrowLeft, ArrowRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NotFoundLink {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  href: string;
}

export interface NotFoundProps {
  errorCode?: string;
  title?: string;
  description?: string;
  links?: NotFoundLink[];
  onBackClick?: () => void;
  onHomeClick?: () => void;
  backButtonText?: string;
  homeButtonText?: string;
  showBackground?: boolean;
  className?: string;
  children?: ReactNode;
}

export function NotFound({
  errorCode = "404 error",
  title = "We can't find this page",
  description = "The page you are looking for doesn't exist or has been moved.",
  links = [],
  onBackClick,
  onHomeClick,
  backButtonText = "Go back",
  homeButtonText = "Go Home",
  showBackground = true,
  className,
  children,
}: NotFoundProps) {
  return (
    <main
      className={cn(
        "h-screen w-full flex items-start md:items-center justify-center py-16 px-4 md:py-24 md:px-20",
        className
      )}
    >
      {showBackground && (
        <div
          className="fixed inset-0 z-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 60% 40% at 50% 0%, black 0%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 40% at 50% 0%, black 0%, transparent 100%)",
          }}
        />
      )}

      <section className="flex flex-col items-center gap-8 md:gap-16 z-10 w-full max-w-2xl">
        {children || (
          <>
            <div className="flex flex-col items-center gap-8 md:gap-12 w-full">
              {/* Header */}
              <header className="flex flex-col items-center gap-4">
                {/* Badge */}
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium font-schibsted"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--text-primary)" }} />
                  {errorCode}
                </span>

                <div className="flex flex-col items-center gap-4 md:gap-6">
                  <h1
                    className="text-center text-4xl md:text-6xl font-bold font-fustat"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h1>
                  <p
                    className="text-center text-lg md:text-xl font-schibsted"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {description}
                  </p>
                </div>
              </header>

              {/* Buttons */}
              <div className="flex gap-3 flex-col md:flex-row w-full items-center justify-center">
                <button
                  onClick={onBackClick}
                  className="w-full md:w-fit inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-5 py-2.5 text-sm font-medium font-schibsted transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backButtonText}
                </button>
                <button
                  onClick={onHomeClick}
                  className="w-full md:w-fit inline-flex items-center justify-center rounded-lg btn-primary px-5 py-2.5 text-sm font-medium font-schibsted hover:opacity-90 transition-opacity"
                >
                  {homeButtonText}
                </button>
              </div>
            </div>

            {/* Quick Links */}
            {links.length > 0 && (
              <div className="flex flex-col divide-y divide-[var(--border-subtle)] w-full border-t border-b border-[var(--border-subtle)]">
                {links.map((link) => (
                  <Link
                    href={link.href}
                    key={link.title}
                    className="py-5 flex items-start md:items-center gap-4 md:gap-5 flex-col md:flex-row hover:bg-[var(--bg-hover)] transition-colors rounded-lg px-2"
                  >
                    <div
                      className="border border-[var(--border-subtle)] p-2.5 md:p-3 rounded-lg"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <link.icon className="size-5 md:size-6" style={{ color: "var(--text-primary)" }} />
                    </div>
                    <div className="flex gap-5 flex-1 w-full items-center">
                      <div className="flex flex-col gap-1">
                        <div className="text-base font-semibold font-fustat" style={{ color: "var(--text-primary)" }}>
                          {link.title}
                        </div>
                        <div className="text-sm font-schibsted" style={{ color: "var(--text-secondary)" }}>
                          {link.subtitle}
                        </div>
                      </div>
                      <div className="self-start md:self-center ml-auto">
                        <ArrowRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
