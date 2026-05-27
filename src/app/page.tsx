import { Navbar, GridBackground, HeroContent } from "@/components/layout";
import React from "react";

export default function HomePage() {
  return (
    <React.Fragment>
      <Navbar />
      <main className="flex flex-col">
        {/* Hero Section */}
        <section
          className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-page)" }}
        >
          <GridBackground />
          <HeroContent />
        </section>
      </main>
    </React.Fragment>
  );
}
