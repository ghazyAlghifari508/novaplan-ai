import { completeChat } from "@/lib/ai-client";
import { SUMMARY_MODEL } from "@/lib/constants";

export const MAX_PROJECT_DESCRIPTION_LENGTH = 200;

const OVERVIEW_REGEX =
	/<!-- SECTION: Overview -->\s*([\s\S]*?)<!-- \/SECTION -->/;

/**
 * Extract the Overview section body from a saved PRD (section markers are
 * emitted by prompts.ts PRD_SECTION_TEMPLATE). Returns null when markers
 * are absent so callers can fall back to other context.
 */
export function extractOverviewSection(prdContent: string): string | null {
	if (!prdContent) return null;
	const match = prdContent.match(OVERVIEW_REGEX);
	const body = match?.[1]?.trim();
	return body || null;
}

function cleanModelOutput(raw: string): string {
	// One line, no wrapping quotes, no trailing period run.
	return raw
		.replace(/^["'\s]+|["'\s]+$/g, "")
		.replace(/\s*\n+\s*/g, " ")
		.replace(/\.{2,}$/g, "")
		.trim();
}

/**
 * Ask a cheap model for a one-sentence Bahasa Indonesia summary of the project.
 * Fire-and-forget friendly: never throws, returns null on any failure so the
 * caller can simply skip writing a description.
 */
export async function generateProjectSummary(params: {
	prdContent: string;
	ideaPrompt: string;
}): Promise<string | null> {
	try {
		const overview = extractOverviewSection(params.prdContent);
		const contextParts: string[] = [];
		if (overview) {
			contextParts.push(`Bagian Overview dari PRD:\n${overview}`);
		}
		if (params.ideaPrompt) {
			contextParts.push(`Ide awal dari user:\n${params.ideaPrompt}`);
		}
		if (contextParts.length === 0) return null;

		const raw = await completeChat(
			[
				{
					role: "system",
					content:
						"Ringkas proyek software berikut menjadi SATU kalimat Bahasa Indonesia " +
						`maksimal ${MAX_PROJECT_DESCRIPTION_LENGTH - 40} karakter yang menjelaskan ` +
						"apa yang dibangun dan untuk siapa. Hanya kalimat ringkasan, tanpa quotes, " +
						"tanpa poin, tanpa penjelasan lain.",
				},
				{ role: "user", content: contextParts.join("\n\n") },
			],
			SUMMARY_MODEL,
		);

		const cleaned = cleanModelOutput(raw);
		if (!cleaned) return null;
		return cleaned.slice(0, MAX_PROJECT_DESCRIPTION_LENGTH);
	} catch {
		// Summary is cosmetic; silence is safer than propagating into SSE flow.
		return null;
	}
}
