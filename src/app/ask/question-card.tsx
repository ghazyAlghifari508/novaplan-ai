"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface NonTechAnswer {
	value: string;
	isCustom: boolean;
	skipped: boolean;
}

interface QuestionCardProps {
	question: string;
	options: string[];
	answer: NonTechAnswer | undefined;
	onAnswer: (answer: NonTechAnswer) => void;
}

export function QuestionCard({
	question,
	options,
	answer,
	onAnswer,
}: QuestionCardProps) {
	const [customText, setCustomText] = useState("");
	const [showCustomInput, setShowCustomInput] = useState(false);

	const submitCustom = () => {
		if (!customText.trim()) return;
		onAnswer({ value: customText.trim(), isCustom: true, skipped: false });
		setShowCustomInput(false);
	};

	return (
		<div
			className="rounded-2xl border border-(--border-subtle) p-6 shadow-(--shadow-surface)"
			style={{ background: "var(--bg-card)" }}
		>
			<h3
				className="mb-4 font-inter text-base font-[510]"
				style={{ color: "var(--text-primary)" }}
			>
				{question}
			</h3>
			<div className="flex flex-wrap gap-2">
				{options.map((opt) => (
					<button
						type="button"
						key={opt}
						onClick={() => {
							setShowCustomInput(false);
							onAnswer({ value: opt, isCustom: false, skipped: false });
						}}
						className={cn(
							"rounded-full px-4 py-2 font-inter text-sm transition-colors",
							answer?.value === opt && !answer.isCustom
								? "btn-primary"
								: "border border-(--border-subtle) text-fog hover:bg-white/5 hover:text-snow",
						)}
					>
						{opt}
					</button>
				))}
				<button
					type="button"
					onClick={() => setShowCustomInput(true)}
					className={cn(
						"rounded-full border border-dashed border-(--border-subtle) px-4 py-2 font-inter text-sm transition-colors",
						answer?.isCustom
							? "btn-primary border-solid"
							: "text-fog hover:bg-white/5 hover:text-snow",
					)}
				>
					+ Lainnya
				</button>
				<button
					type="button"
					onClick={() => {
						setShowCustomInput(false);
						onAnswer({ value: "", isCustom: false, skipped: true });
					}}
					className={cn(
						"rounded-full px-4 py-2 font-inter text-sm transition-colors",
						answer?.skipped ? "bg-steel text-snow" : "text-fog hover:text-snow",
					)}
				>
					Biarkan AI yang memilih
				</button>
			</div>
			{showCustomInput && (
				<div className="mt-3 flex gap-2">
					<input
						type="text"
						value={customText}
						onChange={(e) => setCustomText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								submitCustom();
							}
						}}
						placeholder="Tulis jawabanmu..."
						className="flex-1 rounded-lg border border-(--border-subtle) px-3 py-2 font-inter text-sm shadow-(--shadow-inset) outline-none"
						style={{
							background: "var(--bg-input)",
							color: "var(--text-primary)",
						}}
					/>
					<button
						type="button"
						onClick={submitCustom}
						className="btn-primary rounded-lg px-4 py-2 font-inter text-sm font-[510]"
					>
						Simpan
					</button>
				</div>
			)}
			{answer?.isCustom && !showCustomInput && (
				<p className="mt-3 font-inter text-sm text-fog">
					Jawabanmu:{" "}
					<span style={{ color: "var(--text-primary)" }}>{answer.value}</span>
				</p>
			)}
		</div>
	);
}
