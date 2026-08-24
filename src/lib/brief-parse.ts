import { BRIEF_MAX_BYTES, BRIEF_MAX_CHARS } from "@/lib/constants";
export function truncateBrief(text: string): {
	text: string;
	truncated: boolean;
} {
	if (text.length <= BRIEF_MAX_CHARS) return { text, truncated: false };
	return { text: text.slice(0, BRIEF_MAX_CHARS), truncated: true };
}
export async function parseBriefFile(
	file: File,
): Promise<{ text: string; truncated: boolean }> {
	if (file.size > BRIEF_MAX_BYTES)
		throw new Error("File terlalu besar (max 2MB)");
	const raw = await file.text(); // V1: only .txt/.md, pdf deferred
	return truncateBrief(raw);
}
