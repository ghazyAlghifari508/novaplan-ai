/**
 * AI model selection + streaming orchestration - pure logic, copied from old
 * project. Depends only on ai-client streamChat + model-config.
 */
import { streamChat } from "@/lib/ai-client";
import { ALL_MODELS, getUnlockedModelIds, isModelUnlocked } from "@/lib/model-config";
import type { Plan } from "@/types/database";

export function selectModels(plan: Plan, requestedModel?: string): string[] {
  const modelsToTry = getUnlockedModelIds(plan);

  if (requestedModel) {
    const requestedModelMeta = ALL_MODELS.find((model) => model.id === requestedModel);
    const isAllowed = requestedModelMeta ? isModelUnlocked(requestedModelMeta.tier, plan) : false;

    if (isAllowed) {
      return [requestedModel, ...modelsToTry.filter((m) => m !== requestedModel)];
    }
  }

  return modelsToTry;
}

export async function tryStreamWithFallback(
  models: string[],
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  externalSignal?: AbortSignal,
  maxTokens?: number,
): Promise<{
  generator: AsyncGenerator<string, void, undefined>;
  firstChunk: string;
  abortController: AbortController;
}> {
  let lastError = "";

  for (let i = 0; i < models.length; i++) {
    const modelToTry = models[i];
    const abortController = new AbortController();
    if (externalSignal) {
      if (externalSignal.aborted) abortController.abort();
      else externalSignal.addEventListener("abort", () => abortController.abort(), { once: true });
    }
    const gen = streamChat(messages, modelToTry, abortController.signal, maxTokens);

    try {
      const first = await gen.next();

      if (first.done || typeof first.value !== "string" || !first.value) {
        throw new Error("Respons kosong dari chunk model.");
      }

      return { generator: gen, firstChunk: first.value, abortController };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      abortController.abort();
      await gen.return().catch(() => {});
      continue;
    }
  }

  throw new Error(`Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`);
}
