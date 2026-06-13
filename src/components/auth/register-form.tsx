"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = (password: string, confirmPassword: string): string | null => {
    if (!password || password.length < 8) {
      return "Password minimal 8 karakter";
    }
    if (password !== confirmPassword) {
      return "Password dan konfirmasi password tidak cocok";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const validationError = validate(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        redirectTo: `${window.location.origin}/auth/callback`,
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.message ?? "Gagal membuat akun.");
      setLoading(false);
      return;
    }

    if (data?.requireEmailVerification) {
      // InsForge requires email verification — redirect to verification page
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } else {
      router.refresh();
      window.location.assign("/onboarding");
    }
  };

  const handleGoogleSignUp = async () => {
    window.location.assign("/api/auth/oauth/google?next=/");
  };

  return (
    <SignInPage
      mode="register"
      heroImageSrc="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
      testimonials={sampleTestimonials}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      onGoogleSignIn={handleGoogleSignUp}
    />
  );
}
