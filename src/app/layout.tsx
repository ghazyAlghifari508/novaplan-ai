import type { Metadata } from "next";
import { Fustat, Schibsted_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Toast } from "@/components/ui";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const fustat = Fustat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-fustat",
  display: "swap",
});

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-schibsted",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NovaPlan — AI PRD Generator",
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
    title: "NovaPlan — AI PRD Generator",
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
      className={`${fustat.variable} ${schibstedGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>
          {children}
          <Analytics />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}