"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// ponytail: single theme-aware logo.
// All app surfaces use CSS-variable colors that flip with the theme class
// (charcoal is dark in dark mode, light in light mode), so there is NO surface
// that stays dark in both modes, every logo must follow the theme.
// Tailwind's `dark:` variant can't be used: the @custom-variant lives in
// globals.css, which loads as a ?url stylesheet Tailwind can't see, so `dark:`
// falls back to the OS media query and mismatches the app theme. useTheme()
// tracks the app theme directly.
// Images cropped to content bbox (black 389x121, white 285x81).
export function Logo({
  href = "/",
  className = "",
  height = 32,
}: {
  href?: string;
  className?: string;
  height?: number;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const style = { height: `${height}px`, width: "auto" };

  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      <img
        src={isDark ? "/logo-novaplan-white.png" : "/logo-novaplan-black.png"}
        alt="NovaPlan"
        style={style}
      />
    </Link>
  );
}
