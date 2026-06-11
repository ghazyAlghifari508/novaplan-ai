"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { insforge } from "@/lib/insforge/client";
import { SignInPage, Testimonial } from "@/components/ui/sign-in";

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    name: "Sarah Chen",
    handle: "@sarah_pm",
    text: "PRD selesai dalam hitungan menit, bukan hari. NovaPlan mengubah cara tim kami bekerja."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    name: "Budi Santoso",
    handle: "@buditech",
    text: "Desain antarmuka yang sangat intuitif. Fitur AI-nya sangat akurat dan menghemat waktu."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop",
    name: "Dian Anggraini",
    handle: "@dian_product",
    text: "Sangat mudah digunakan untuk kolaborasi tim. Hasil export-nya profesional."
  },
];

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        setError("Email dan password harus diisi.");
        setLoading(false);
        return;
    }

    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Session is auto-managed by InsForge SDK (httpOnly cookie)
    if (data?.accessToken) {
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    window.location.assign(`/api/auth/oauth/google?next=${encodeURIComponent(redirectTo)}`);
  };

  return (
    <SignInPage
      mode="login"
      heroImageSrc="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
      testimonials={sampleTestimonials}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      onGoogleSignIn={handleGoogleLogin}
    />
  );
}
