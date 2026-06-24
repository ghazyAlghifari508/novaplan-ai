import { RegisterForm } from "@/components/auth/register-form";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-(--text-secondary) flex h-screen w-screen items-center justify-center bg-(--bg-card)">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}