"use client";

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

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
  <div className={`rounded-md ${isError ? 'shadow-[inset_0_0_0_1px_rgba(235,87,87,0.75)]' : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]'} bg-steel transition-shadow duration-300 focus-within:shadow-[inset_0_0_0_1px_rgba(94,106,210,0.85)]`}
  >
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} w-64 rounded-xl bg-charcoal p-5 text-left shadow-[inset_0_0_0_1px_rgb(35,37,42),0_2px_4px_rgba(0,0,0,0.4)]`}>
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-2 font-[510] text-snow">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
        {testimonial.name}
      </p>
      <p className="text-xs text-slate">{testimonial.handle}</p>
      <p className="mt-2 text-fog">{testimonial.text}</p>
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

  const defaultTitle = isRegister ? "Daftar NovaPlan" : "Masuk ke NovaPlan";
  const defaultDesc = isRegister ? "Mulai hasilkan PRD profesional dengan bantuan AI dalam hitungan menit." : "Akses akun Anda dan lanjutkan pekerjaan luar biasa bersama tim Anda.";

  return (
    <div
      className={`flex min-h-[100dvh] w-[100dvw] flex-col bg-onyx font-inter ${isRegister ? 'md:flex-row-reverse' : 'md:flex-row'}`}
      style={{ background: "var(--bg-page)" }}
    >
      {/* Left column: sign-in form */}
      <section className="flex-1 overflow-y-auto p-6 md:flex md:items-center md:justify-center md:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <Link href="/" className="animate-element animate-delay-100 mb-4 inline-flex w-fit items-center gap-2 font-inter text-[15px] font-[510] text-snow">
              <span className="h-2 w-2 rounded-[2px] bg-snow shadow-[0_0_0_1px_var(--color-graphite)]" />
              NovaPlan
            </Link>
            
            <h1 className="animate-element animate-delay-100 font-inter text-4xl font-light leading-tight text-snow md:text-[40px]">
              {title || defaultTitle}
            </h1>
            <p className="animate-element animate-delay-200 leading-relaxed text-fog">
              {description || defaultDesc}
            </p>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="mb-1.5 block text-sm font-[510] text-mist">Alamat Email</label>
                <GlassInputWrapper isError={!!error}>
                  <input name="email" type="email" placeholder="contoh@perusahaan.com" required disabled={loading}
                    className="w-full rounded-md bg-transparent p-3 text-sm text-snow placeholder:text-slate focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="mb-1.5 block text-sm font-[510] text-mist">Password</label>
                <GlassInputWrapper isError={!!error}>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} required disabled={loading} placeholder="Minimal 8 karakter"
                      className="w-full rounded-md bg-transparent p-3 pr-12 text-sm text-snow placeholder:text-slate focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center outline-none">
                      {showPassword ? <EyeOff className="h-5 w-5 text-fog transition-colors hover:text-snow" /> : <Eye className="h-5 w-5 text-fog transition-colors hover:text-snow" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {isRegister && (
                 <div className="animate-element animate-delay-400">
                  <label className="mb-1.5 block text-sm font-[510] text-mist">Konfirmasi Password</label>
                  <GlassInputWrapper isError={!!error}>
                    <div className="relative">
                      <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required disabled={loading} placeholder="Masukkan ulang password Anda" className="w-full rounded-md bg-transparent p-3 pr-12 text-sm text-snow placeholder:text-slate focus:outline-none" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center outline-none">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-fog transition-colors hover:text-snow" /> : <Eye className="h-5 w-5 text-fog transition-colors hover:text-snow" />}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              )}

              {!isRegister && (
                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="rounded border-(--border-subtle) text-(--text-primary) focus:ring-primary-black" />
                    <span className="font-[510] text-mist">Ingat saya</span>
                  </label>
                  <Link href="/forgot-password" className="font-[510] text-fog transition-colors hover:text-snow">Lupa password?</Link>
                </div>
              )}

              {error && (
                <div className="animate-element animate-delay-500 rounded-md bg-crimson/10 p-4 text-sm font-[510] text-crimson shadow-[inset_0_0_0_1px_rgba(235,87,87,0.35)]">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="animate-element animate-delay-600 btn-primary flex w-full items-center justify-center gap-2 rounded-md py-3 font-[510] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
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
              <span className="w-full border-t border-graphite"></span>
              <span
                className="absolute bg-onyx px-4 text-sm font-[510] text-fog"
              >Atau gunakan</span>
            </div>

            <button onClick={onGoogleSignIn} type="button" disabled={loading}
              className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-md py-3 font-[510] text-snow shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
            >
                <GoogleIcon />
                Lanjutkan dengan Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm font-[510] text-fog">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} {' '}
              <Link href={isRegister ? '/login' : '/register'} className="text-snow underline transition-opacity hover:opacity-70">
                {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="relative hidden flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-xl bg-cover bg-center shadow-[var(--shadow-overlay)]"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-12 left-1/2 z-10 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
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
