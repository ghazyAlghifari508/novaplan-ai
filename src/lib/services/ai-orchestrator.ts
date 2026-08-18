/**
 * AI streaming orchestration — simplified for combo routing.
 * 9Router handles model selection + fallback via novaplan-combo.
 */
import { type StreamOutcome, streamChat } from "@/lib/ai-client";
import { COMBO_MODEL_ID } from "@/lib/model-config";

/** Returns single-element array with combo ID. No plan/model params needed. */
export function selectModels(): string[] {
	return [COMBO_MODEL_ID];
}

export async function tryStreamWithFallback(
	models: string[],
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	externalSignal?: AbortSignal,
	maxTokens?: number,
	onThinking?: (text: string) => void,
): Promise<{
	generator: AsyncGenerator<string, void, undefined>;
	firstChunk: string;
	abortController: AbortController;
	outcome: StreamOutcome;
}> {
	let lastError = "";

	for (let i = 0; i < models.length; i++) {
		const modelToTry = models[i];
		const abortController = new AbortController();
		if (externalSignal) {
			if (externalSignal.aborted) abortController.abort();
			else
				externalSignal.addEventListener(
					"abort",
					() => abortController.abort(),
					{ once: true },
				);
		}
		const outcome: StreamOutcome = {};
		const gen = streamChat(
			messages,
			modelToTry,
			abortController.signal,
			maxTokens,
			outcome,
			onThinking,
		);

		try {
			const first = await gen.next();

			if (first.done || typeof first.value !== "string" || !first.value) {
				throw new Error("Respons kosong dari chunk model.");
			}

			return {
				generator: gen,
				firstChunk: first.value,
				abortController,
				outcome,
			};
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
			abortController.abort();
			await gen.return().catch(() => {});
		}
	}

	throw new Error(
		`Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`,
	);
}
