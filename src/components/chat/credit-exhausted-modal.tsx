"use client";

import { AlertCircle, X } from "lucide-react";
import * as React from "react";
import { PricingComponent } from "@/components/ui/pricing-card";
import { novaPlanPlans, type PriceTier } from "@/lib/pricing-data";
import { saveResumeIntent } from "@/lib/prompt-handoff";
import { useUIStore } from "@/store";

interface CreditExhaustedModalProps {
	isOpen: boolean;
	onClose: () => void;
	errorMessage: string;
	projectId: string;
	stage: "prd" | "ac" | "task";
	currentPlan?: string;
}

export function CreditExhaustedModal({
	isOpen,
	onClose,
	errorMessage,
	projectId,
	stage,
	currentPlan = "free",
}: CreditExhaustedModalProps) {
	const [plan, setPlan] = React.useState(currentPlan);
	const showToast = useUIStore((s) => s.showToast);

	React.useEffect(() => {
		if (!isOpen) return;
		const fetchPlan = async () => {
			try {
				const res = await fetch("/api/user/plan");
				if (res.ok) {
					const data = await res.json();
					setPlan(data.plan || "free");
				}
			} catch {
				// keep currentPlan
			}
		};
		fetchPlan();
	}, [isOpen]);

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
				className="relative w-full max-w-4xl overflow-y-auto max-h-[90vh] rounded-xl bg-obsidian shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200 my-8"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="relative p-6 pb-0 text-center">
					<button
						onClick={onClose}
						className="absolute right-6 top-6 text-fog transition-colors hover:text-snow"
					>
						<X size={20} />
					</button>
					<div className="inline-flex items-center justify-center gap-2">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson">
							<AlertCircle size={20} strokeWidth={2} />
						</div>
						<h3 className="font-inter text-xl font-[510] text-snow">
							Kredit Habis
						</h3>
					</div>
					<p className="mt-2 font-inter text-sm text-fog">
						{errorMessage}
					</p>
				</div>

				{/* Embedded pricing cards */}
				<div className="px-2 pb-4">
					<PricingComponent
						plans={novaPlanPlans as [PriceTier, PriceTier, PriceTier]}
						onPlanSelect={handlePlanSelect}
						currentPlan={plan}
						showComparison={false}
					/>
				</div>
			</div>
		</div>
	);
}
