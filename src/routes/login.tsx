import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	return (
		<Suspense
			fallback={
				<div
					className="flex h-screen w-screen items-center justify-center"
					style={{
						background: "var(--bg-page)",
						color: "var(--text-secondary)",
					}}
				>
					Loading...
				</div>
			}
		>
			<LoginForm />
		</Suspense>
	);
}
