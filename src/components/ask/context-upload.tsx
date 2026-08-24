"use client";
import { useState } from "react";
import { parseBriefFile } from "@/lib/brief-parse";
import { BRIEF_MAX_CHARS } from "@/lib/constants";
export function ContextUpload({
	onContext,
}: {
	onContext: (text: string) => void;
}) {
	const [name, setName] = useState<string | null>(null);
	return (
		<div className="rounded-lg border border-graphite bg-charcoal p-4">
			<label htmlFor="brief-file-input" className="text-sm font-[510]">
				Tambah Konteks (opsional)
			</label>
			<input
				id="brief-file-input"
				type="file"
				accept=".txt,.md"
				onChange={async (e) => {
					const f = e.target.files?.[0];
					if (!f) return;
					try {
						const { text } = await parseBriefFile(f);
						onContext(text);
						setName(f.name);
					} catch (err) {
						alert((err as Error).message);
					}
				}}
				className="mt-2 block text-sm"
			/>
			{name && <p className="mt-2 text-xs text-emerald">Loaded: {name}</p>}
			<textarea
				placeholder="Atau paste brief/URL kompetitor..."
				onBlur={(e) => onContext(e.target.value.slice(0, BRIEF_MAX_CHARS))}
				className="mt-3 w-full rounded bg-obsidian p-2 text-sm"
				rows={3}
			/>
		</div>
	);
}
