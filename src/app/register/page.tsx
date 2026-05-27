import { RegisterForm } from "@/components/auth/register-form";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-text-gray dark:text-[#A0A0A0] flex h-screen w-screen items-center justify-center bg-white dark:bg-[#1E1E1E]">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}