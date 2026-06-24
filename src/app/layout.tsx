import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Toast } from "@/components/ui";
import { Analytics } from "@vercel/analytics/react";
import { AppLayout } from "@/components/layout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-base",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-base",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NovaPlan - AI PRD Generator",
    template: "%s | NovaPlan",
  },
  description:
    "Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari. Generate Product Requirements Document lengkap dengan AI.",
  keywords: [
    "PRD generator",
    "AI PRD",
    "product requirements document",
    "AI document generator",
    "NovaPlan",
  ],
  openGraph: {
    title: "NovaPlan - AI PRD Generator",
    description:
      "Dari ide ke PRD profesional dalam 5 menit. Generate PRD lengkap dengan AI.",
    url: "https://novaplan.ai",
    siteName: "NovaPlan",
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
          <Analytics />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
