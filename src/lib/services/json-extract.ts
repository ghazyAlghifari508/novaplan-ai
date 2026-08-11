/**
 * Extract JSON object text from a raw LLM completion that may wrap it in a
 * markdown fence.
 *
 * Greedy fence match (last ``` in the string, not the first) — a non-greedy
 * match breaks when the JSON string values themselves contain a backtick
 * fence (e.g. task "details" describing a shell command), truncating the
 * extracted JSON mid-object and failing JSON.parse downstream.
 */
export function extractJson(raw: string): string {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*)```/i);
	if (fenced) return fenced[1].trim();
	const firstBrace = raw.indexOf("{");
	const lastBrace = raw.lastIndexOf("}");
	if (firstBrace !== -1 && lastBrace > firstBrace)
		return raw.slice(firstBrace, lastBrace + 1);
	return raw.trim();
}
