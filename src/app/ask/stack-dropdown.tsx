"use client";

import {
	ArrowDownUp,
	Check,
	ChevronDown,
	type LucideIcon,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StackDropdownProps {
	label: string;
	subtitle: string;
	icon: LucideIcon;
	accent: string;
	placeholder: string;
	options: string[];
	value: string | undefined;
	disabled: boolean;
	onChange: (value: string | undefined) => void;
}

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
	const selectId = useId();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const [open, setOpen] = useState(false);
	const [customMode, setCustomMode] = useState(false);
	const [customDraft, setCustomDraft] = useState("");
	const [highlightIdx, setHighlightIdx] = useState(-1);

	const isCustomValue = Boolean(value) && !options.includes(value ?? "");
	const displayValue = value || "";

	// close on outside click
	useEffect(() => {
		if (!open) return;
		const handler = (e: PointerEvent) => {
			const t = e.target as Node;
			if (triggerRef.current?.contains(t) || listRef.current?.contains(t))
				return;
			setOpen(false);
			setCustomMode(false);
		};
		document.addEventListener("pointerdown", handler);
		return () => document.removeEventListener("pointerdown", handler);
	}, [open]);

	const commitCustom = useCallback(() => {
		const trimmed = customDraft.trim();
		onChange(trimmed || undefined);
		setCustomMode(false);
		setCustomDraft("");
		setOpen(false);
	}, [customDraft, onChange]);

	const selectOption = useCallback(
		(opt: string) => {
			if (opt === "__custom__") {
				setCustomMode(true);
				setCustomDraft(isCustomValue ? (value ?? "") : "");
				setHighlightIdx(-1);
				return;
			}
			onChange(opt);
			setOpen(false);
			setCustomMode(false);
			setHighlightIdx(-1);
		},
		[onChange, isCustomValue, value],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;

		if (
			!open &&
			(e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
		) {
			e.preventDefault();
			setOpen(true);
			setHighlightIdx(0);
			return;
		}

		if (!open) return;

		const allItems = [...options, "__custom__"];
		const maxIdx = allItems.length - 1;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightIdx((prev) => (prev >= maxIdx ? 0 : prev + 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightIdx((prev) => (prev <= 0 ? maxIdx : prev - 1));
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				if (highlightIdx >= 0 && highlightIdx <= maxIdx) {
					selectOption(allItems[highlightIdx]);
				}
				break;
			case "Escape":
				e.preventDefault();
				setOpen(false);
				setCustomMode(false);
				break;
		}
	};

	const clearable = Boolean(displayValue || isCustomValue || customMode);

	return (
		<div
			className={cn(
				"rounded-2xl border border-(--border-subtle) p-5 shadow-(--shadow-surface) transition-opacity",
				disabled && "pointer-events-none opacity-40",
			)}
			style={{ background: "var(--bg-card)" }}
		>
			{/* header */}
			<div className="mb-4 flex items-center gap-3">
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
					style={{ background: `${accent}24`, color: accent }}
				>
					<Icon size={18} />
				</div>
				<div className="min-w-0 flex-1">
					<p
						className="font-inter text-sm font-[510]"
						style={{ color: "var(--text-primary)" }}
					>
						{label}
					</p>
					<p className="font-inter text-xs text-fog">{subtitle}</p>
				</div>

				{clearable && !disabled && (
					<button
						type="button"
						onClick={() => {
							onChange(undefined);
							setCustomMode(false);
							setCustomDraft("");
							setOpen(false);
						}}
						className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-crimson transition-colors hover:bg-crimson/10"
						aria-label={`Hapus pilihan ${label}`}
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* trigger */}
			<div className="relative">
				<button
					ref={triggerRef}
					type="button"
					id={selectId}
					disabled={disabled}
					onClick={() => {
						if (disabled) return;
						setOpen((o) => !o);
						if (!open) setHighlightIdx(options.indexOf(value ?? ""));
					}}
					onKeyDown={handleKeyDown}
					className={cn(
						"flex w-full items-center justify-between rounded-lg border px-4 py-3 font-inter text-sm transition-all focus-visible:outline-none",
						open ? "border-(--text-secondary)" : "border-(--border-subtle)",
					)}
					style={{
						background: "var(--bg-input)",
						color: displayValue ? "var(--text-primary)" : "var(--text-muted)",
					}}
				>
					<span className="truncate">
						{displayValue && !isCustomValue
							? displayValue
							: isCustomValue
								? value
								: placeholder}
					</span>
					<ChevronDown
						size={16}
						aria-hidden="true"
						className={cn(
							"shrink-0 text-fog transition-transform",
							open && "rotate-180",
						)}
					/>
				</button>

				{open && (
					<div
						ref={listRef}
						role="listbox"
						className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--border-subtle) py-1 shadow-(--shadow-overlay)"
						style={{ background: "var(--bg-elevated)" }}
					>
						{options.map((opt, i) => {
							const selected = opt === value;
							return (
								<div
									key={opt}
									role="option"
									tabIndex={0}
									aria-selected={selected}
									onPointerDown={(e) => {
										e.preventDefault();
										selectOption(opt);
									}}
									className={cn(
										"flex cursor-pointer items-center justify-between px-4 py-2.5 font-inter text-sm transition-colors",
										i === highlightIdx
											? "bg-white/10 text-snow"
											: selected
												? "text-snow"
												: "text-fog hover:bg-white/5 hover:text-snow",
									)}
								>
									<span className="truncate">{opt}</span>
									{selected && (
										<Check size={14} className="shrink-0 text-fog" />
									)}
								</div>
							);
						})}

						{customMode ? (
							<div className="px-3 py-2">
								<input
									type="text"
									value={customDraft}
									onChange={(e) => setCustomDraft(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											commitCustom();
										}
										if (e.key === "Escape") {
											e.preventDefault();
											setCustomMode(false);
										}
									}}
									onBlur={commitCustom}
									placeholder="Tulis pilihanmu..."
									className="w-full rounded-md border border-(--border-subtle) px-3 py-2 font-inter text-sm outline-none"
									style={{
										background: "var(--bg-input)",
										color: "var(--text-primary)",
									}}
									// biome-ignore lint/a11y/noAutofocus: custom select needs focus on custom input
									autoFocus
								/>
							</div>
						) : (
							<div
								role="option"
								tabIndex={0}
								onPointerDown={(e) => {
									e.preventDefault();
									selectOption("__custom__");
								}}
								className={cn(
									"flex cursor-pointer items-center gap-2 px-4 py-2.5 font-inter text-sm transition-colors",
									highlightIdx === options.length
										? "bg-white/10 text-snow"
										: "text-fog hover:bg-white/5 hover:text-snow",
								)}
							>
								<ArrowDownUp size={14} className="shrink-0" />
								<span>Lainnya...</span>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
