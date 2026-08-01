"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface StackDropdownProps {
	label: string;
	subtitle: string;
	icon: LucideIcon;
	/** Hex accent for the icon tile. Tinted at 18% for bg, full for the glyph. */
	accent: string;
	placeholder: string;
	options: string[];
	value: string | undefined;
	disabled: boolean;
	onChange: (value: string | undefined) => void;
}

const CUSTOM = "__custom__";

export function StackDropdown({
	label,
	subtitle,
	icon: Icon,
	accent,
	placeholder,
	options,
	value,
	disabled,
	onChange,
}: StackDropdownProps) {
	// Custom mode is explicit state, not derived: a value outside `options` means
	// custom, but so does "custom picked, nothing typed yet" (value still undefined).
	const selectId = useId();
	const [customMode, setCustomMode] = useState(false);
	const isCustomValue = Boolean(value) && !options.includes(value ?? "");
	const showCustom = customMode || isCustomValue;

	return (
		<div
			className={cn(
				"rounded-2xl border border-(--border-subtle) p-5 shadow-(--shadow-surface) transition-opacity",
				disabled && "pointer-events-none opacity-40",
			)}
			style={{ background: "var(--bg-card)" }}
		>
			<div className="mb-4 flex items-center gap-3">
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
					style={{ background: `${accent}24`, color: accent }}
				>
					<Icon size={18} />
				</div>
				<div className="min-w-0">
					<label
						htmlFor={selectId}
						className="block font-inter text-sm font-[510]"
						style={{ color: "var(--text-primary)" }}
					>
						{label}
					</label>
					<p className="font-inter text-xs text-fog">{subtitle}</p>
				</div>
			</div>

			<div className="relative">
				<select
					id={selectId}
					disabled={disabled}
					value={showCustom ? CUSTOM : (value ?? "")}
					onChange={(e) => {
						if (e.target.value === CUSTOM) {
							setCustomMode(true);
							onChange(undefined);
							return;
						}
						setCustomMode(false);
						onChange(e.target.value || undefined);
					}}
					className="w-full appearance-none rounded-lg border border-(--border-subtle) py-3 pr-10 pl-4 font-inter text-sm shadow-(--shadow-inset) outline-none transition-all focus:border-(--text-secondary) disabled:cursor-not-allowed"
					style={{
						background: "var(--bg-input)",
						color: "var(--text-primary)",
					}}
				>
					<option value="">{placeholder}</option>
					{options.map((opt) => (
						<option key={opt} value={opt}>
							{opt}
						</option>
					))}
					<option value={CUSTOM}>Lainnya...</option>
				</select>
				<ChevronDown
					size={16}
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-fog"
				/>
			</div>

			{showCustom && (
				<input
					type="text"
					disabled={disabled}
					value={isCustomValue ? value : ""}
					onChange={(e) => onChange(e.target.value.trim() || undefined)}
					placeholder="Tulis pilihanmu..."
					className="mt-2 w-full rounded-lg border border-(--border-subtle) px-4 py-3 font-inter text-sm shadow-(--shadow-inset) outline-none"
					style={{
						background: "var(--bg-input)",
						color: "var(--text-primary)",
					}}
				/>
			)}
		</div>
	);
}
