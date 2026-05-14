import { RegisterForm } from "@/components/auth/register-form";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-text-gray flex h-screen w-screen items-center justify-center bg-white">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}