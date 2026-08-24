"use client";
import { useRef, useState } from "react";
import { parseBriefFile } from "@/lib/brief-parse";
import { BRIEF_MAX_CHARS } from "@/lib/constants";
export function ContextUpload({
	onContext,
	onSkip,
}: {
	onContext: (text: string) => void;
	onSkip?: () => void;
}) {
	const [name, setName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	return (
		<div className="rounded-lg border border-graphite bg-charcoal p-4">
			<p className="text-sm font-[510]">Tambah Konteks (opsional)</p>
			<p className="mt-1 text-xs text-fog">
				Upload file .txt/.md atau paste brief/URL kompetitor untuk memperkaya
				hasil PRD.
			</p>
			<input
				ref={fileRef}
				id="brief-file-input"
				type="file"
				accept=".txt,.md"
				className="hidden"
				onChange={async (e) => {
					const f = e.target.files?.[0];
					if (!f) return;
					try {
						const { text } = await parseBriefFile(f);
						onContext(text);
						setName(f.name);
						setError(null);
					} catch (err) {
						setError((err as Error).message);
					}
				}}
			/>
			<div className="mt-3 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-iron/50 bg-iron px-4 py-2 font-inter text-sm font-[510] text-snow transition hover:brightness-105"
				>
					Pilih File .txt/.md
				</button>
				{onSkip && (
					<button
						type="button"
						onClick={onSkip}
						className="font-inter text-sm text-fog hover:text-snow"
					>
						Lewati
					</button>
				)}
			</div>
			{name && <p className="mt-2 text-xs text-emerald">Loaded: {name}</p>}
			{error && <p className="mt-2 text-xs text-crimson">{error}</p>}
			<textarea
				placeholder="Atau paste brief/URL kompetitor..."
				onBlur={(e) => onContext(e.target.value.slice(0, BRIEF_MAX_CHARS))}
				className="mt-3 w-full rounded bg-obsidian p-2 text-sm"
				rows={3}
			/>
		</div>
	);
}
