"use client";

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);


// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  mode?: 'login' | 'register';
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  error?: string | null;
  loading?: boolean;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children, isError }: { children: React.ReactNode, isError?: boolean }) => (
  <div className={`rounded-2xl border ${isError ? 'border-red-500' : 'border-[var(--border-subtle)]'} backdrop-blur-sm transition-colors focus-within:border-[var(--border-medium)]`}
    style={{ background: "var(--bg-input)" }}
  >
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/20 p-5 w-64 text-white`}>
    <Image src={testimonial.avatarSrc} width={40} height={40} className="h-10 w-10 object-cover rounded-2xl bg-white" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-semibold">{testimonial.name}</p>
      <p className="text-white/70 text-xs">{testimonial.handle}</p>
      <p className="mt-1 text-white/90">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  mode = 'login',
  title,
  description,
  heroImageSrc,
  testimonials = [],
  error,
  loading = false,
  onSubmit,
  onGoogleSignIn,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isRegister = mode === 'register';

  const defaultTitle = isRegister ? "Buat Akun NovaPlan" : "Selamat Datang Kembali";
  const defaultDesc = isRegister ? "Mulai hasilkan PRD profesional dengan bantuan AI dalam hitungan menit." : "Akses akun Anda dan lanjutkan pekerjaan luar biasa bersama tim Anda.";

  return (
    <div
      className={`h-[100dvh] flex flex-col font-schibsted w-[100dvw] ${isRegister ? 'md:flex-row-reverse' : 'md:flex-row'}`}
      style={{ background: "var(--bg-page)" }}
    >
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <Link href="/" className="animate-element animate-delay-100 font-fustat text-2xl font-bold tracking-tight mb-4 inline-block w-fit" style={{ color: "var(--text-primary)" }}>
              NovaPlan
            </Link>
            
            <h1 className="animate-element animate-delay-100 text-4xl md:text-[40px] font-bold leading-tight font-fustat tracking-[-1px]" style={{ color: "var(--text-primary)" }}>
              {title || defaultTitle}
            </h1>
            <p className="animate-element animate-delay-200" style={{ color: "var(--text-secondary)" }}>
              {description || defaultDesc}
            </p>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--text-primary)" }}>Alamat Email</label>
                <GlassInputWrapper isError={!!error}>
                  <input name="email" type="email" placeholder="contoh@perusahaan.com" required disabled={loading}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-[var(--text-muted)]"
                    style={{ color: "var(--text-primary)" }}
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--text-primary)" }}>Password</label>
                <GlassInputWrapper isError={!!error}>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} required disabled={loading} placeholder="Minimal 8 karakter"
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none placeholder:text-[var(--text-muted)]"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center outline-none">
                      {showPassword ? <EyeOff className="w-5 h-5 text-text-gray hover:text-primary-black transition-colors" /> : <Eye className="w-5 h-5 text-text-gray hover:text-primary-black transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {isRegister && (
                 <div className="animate-element animate-delay-400">
                  <label className="text-sm font-semibold text-primary-black mb-1.5 block">Konfirmasi Password</label>
                  <GlassInputWrapper isError={!!error}>
                    <div className="relative">
                      <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required disabled={loading} placeholder="Masukkan ulang password Anda" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-primary-black placeholder:text-text-gray/50" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center outline-none">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5 text-text-gray hover:text-primary-black transition-colors" /> : <Eye className="w-5 h-5 text-text-gray hover:text-primary-black transition-colors" />}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              )}

              {!isRegister && (
                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="rounded border-border-subtle text-primary-black focus:ring-primary-black" />
                    <span className="text-primary-black/90 font-medium">Ingat saya</span>
                  </label>
                  <Link href="/forgot-password" className="hover:underline text-text-gray font-medium transition-colors">Lupa password?</Link>
                </div>
              )}

              {error && (
                <div className="animate-element animate-delay-500 rounded-xl bg-red-50 p-4 text-sm text-red-700 font-medium border border-red-100">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="animate-element animate-delay-600 w-full rounded-2xl bg-primary-black py-4 font-bold text-white hover:bg-primary-black/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {isRegister ? 'Daftar Sekarang' : 'Masuk ke Akun'}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-[var(--border-subtle)]"></span>
              <span
                className="px-4 text-sm absolute font-medium"
                style={{ background: "var(--bg-page)", color: "var(--text-secondary)" }}
              >Atau gunakan</span>
            </div>

            <button onClick={onGoogleSignIn} type="button" disabled={loading}
              className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-[var(--border-subtle)] rounded-2xl py-4 hover:bg-[var(--bg-hover)] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
            >
                <GoogleIcon />
                Lanjutkan dengan Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} {' '}
              <Link href={isRegister ? '/login' : '/register'} className="underline hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>
                {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-[32px] bg-cover bg-center shadow-2xl" style={{ backgroundImage: `url(${heroImageSrc})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-[32px]"></div>
          </div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center z-10">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
