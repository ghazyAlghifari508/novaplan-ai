import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center" style={{ background: "var(--bg-page)", color: "var(--text-secondary)" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}