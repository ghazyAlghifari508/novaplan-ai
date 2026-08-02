/**
 * Ask-flow question parsing - mirrors task-service.ts's parseTaskJson
 * strict-validation pattern (reject malformed shape, no partial trust).
 */
export interface AskQuestion {
	id: string;
	question: string;
	options: string[];
}

export function parseAskOptionsJson(jsonString: string): AskQuestion[] | null {
	try {
		const parsed = JSON.parse(jsonString);
		if (
			!parsed.questions ||
			!Array.isArray(parsed.questions) ||
			parsed.questions.length === 0
		)
			return null;

		for (const q of parsed.questions) {
			if (!q.id || typeof q.id !== "string") return null;
			if (!q.question || typeof q.question !== "string") return null;
			if (!Array.isArray(q.options) || q.options.length === 0) return null;
			if (!q.options.every((o: unknown) => typeof o === "string")) return null;
		}

		return parsed.questions as AskQuestion[];
	} catch {
		return null;
	}
}
