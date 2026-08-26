"use client";

import { AlertCircle, X } from "lucide-react";
import { PricingComponent } from "@/components/ui/pricing-card";
import { TopUpCard } from "@/components/ui/top-up-card";
import { useUserPlan } from "@/hooks/use-user-plan";
import { prdFyPlans, type PriceTier } from "@/lib/pricing-data";
import { saveResumeIntent } from "@/lib/prompt-handoff";
import { useUIStore } from "@/store";

interface CreditExhaustedModalProps {
	isOpen: boolean;
	onClose: () => void;
	errorMessage: string;
	projectId: string;
	stage: "prd" | "ac" | "task";
	currentPlan?: string;
	// ponytail: plan-gate paywalls reuse this modal with a stage-specific title
	// ("Lanjut ke AC butuh Pro") instead of the credit-depletion default.
	title?: string;
}

export function CreditExhaustedModal({
	isOpen,
	onClose,
	errorMessage,
	projectId,
	stage,
	currentPlan = "free",
	title = "Kredit Habis",
}: CreditExhaustedModalProps) {
	// ponytail: shared TanStack Query hook — deduped across all components.
	// Previously raw fetch("/api/user/plan") in useEffect.
	const { data: planData } = useUserPlan();
	const plan = planData?.plan ?? currentPlan;
	const showToast = useUIStore((s) => s.showToast);

	const handlePlanSelect = async (planId: string) => {
		if (planId === "free") return;
		try {
			saveResumeIntent(projectId, stage);
			const res = await fetch("/api/payments/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					planId,
					returnUrl: window.location.pathname,
					projectId,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				if (res.status === 401) {
					window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
				} else {
					showToast(data.error || "Gagal memproses pembayaran.", "error");
				}
				return;
			}
			if (data.redirect_url) {
				window.location.href = data.redirect_url;
			}
		} catch {
			showToast("Gagal menghubungi server.", "error");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 overflow-y-auto"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-5xl overflow-y-auto max-h-[80vh] rounded-xl bg-obsidian shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200 my-4"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="relative p-4 pb-0 text-center">
					<button
						onClick={onClose}
						className="absolute right-4 top-4 text-fog transition-colors hover:text-snow"
					>
						<X size={20} />
					</button>
					<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-crimson/10 text-crimson">
						<AlertCircle size={20} strokeWidth={2} />
					</div>
				<h3 className="font-inter text-xl font-[510] text-snow">
					{title}
				</h3>
					<p className="mt-2 font-inter text-sm text-fog">{errorMessage}</p>
				</div>

				{/* Embedded pricing cards */}
				<div className="px-2 pb-3">
					{/* Credits gone but period still running = ideal top-up case
					    (spec §7). Paused users get the renewal cards instead. */}
					{planData?.subscriptionState === "active_paid" && (
						<TopUpCard className="mx-2 mb-2" />
					)}
					<PricingComponent
						plans={prdFyPlans as [PriceTier, PriceTier, PriceTier]}
						onPlanSelect={handlePlanSelect}
						currentPlan={plan}
						showComparison={false}
						showHeader={false}
						compact
						className="!py-3 md:!py-3"
					/>
				</div>
			</div>
		</div>
	);
}
