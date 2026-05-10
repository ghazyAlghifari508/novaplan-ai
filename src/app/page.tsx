import { Navbar, VideoBackground, HeroContent } from "@/components/layout";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary-black">
      <VideoBackground />
      <Navbar />
      <HeroContent />
    </main>
  );
}