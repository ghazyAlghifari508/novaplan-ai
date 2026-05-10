import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Link href="/" className="font-schibsted text-2xl font-semibold tracking-tight">
          NovaPlan
        </Link>
      </div>
      <RegisterForm />
    </div>
  );
}