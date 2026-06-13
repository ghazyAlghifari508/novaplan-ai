import { GridBackground, HeroContent } from "@/components/layout";
import React from "react";

export default function HomePage() {
  return (
    <React.Fragment>

      <main className="flex flex-col">
        {/* Hero Section */}
        <section
          className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden pb-32 md:pb-40"
          style={{ background: "var(--bg-page)" }}
        >
          <GridBackground />
          <HeroContent />
        </section>
      </main>
    </React.Fragment>
  );
}
