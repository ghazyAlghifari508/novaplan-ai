import type React from "react";
import { memo } from "react";
import { useStreamerMode } from "@/components/admin/streamer-mode-context";
import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
	label: string;
	value: string | number;
	subtext?: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	isCurrency?: boolean;
	className?: string;
}

export const AdminMetricCard = memo(function AdminMetricCard({
	label,
	value,
	subtext,
	icon: Icon,
	isCurrency = false,
	className,
}: AdminMetricCardProps) {
	const { isStreamerMode, maskCurrency } = useStreamerMode();

	const displayValue = isCurrency
		? isStreamerMode
			? "••••••••"
			: typeof value === "number"
				? maskCurrency(value)
				: value
		: value;

	return (
		<div
			className={cn(
				"rounded-xl border border-graphite bg-charcoal p-4 sm:p-5 shadow-[var(--shadow-inset)] flex flex-col justify-between transition-colors",
				className,
			)}
		>
			<div className="flex items-center justify-between text-fog">
				<span className="text-xs font-medium text-mist">{label}</span>
				<Icon size={16} className="text-fog" />
			</div>
			<div className="mt-3">
				<p className="text-2xl font-light tracking-tight text-snow">
					{displayValue}
				</p>
				{subtext && (
					<p className="mt-1 truncate text-[11px] text-fog">{subtext}</p>
				)}
			</div>
		</div>
	);
});
