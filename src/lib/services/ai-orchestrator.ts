/**
 * AI model selection and streaming orchestration.
 * Extracted from api/chat/route.ts to isolate AI-specific logic.
 */

import { streamChat, completeChat } from "@/lib/ai-client";
import { ALL_MODELS, getUnlockedModelIds, isModelUnlocked } from "@/lib/model-config";
import type { Plan } from "@/types/database";

/**
 * Build an ordered list of models to try, with the user's preferred model first.
 */
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

/**
 * Try each model in the fallback chain until one produces a response.
 * Returns the generator and its first chunk for continued streaming.
 */
export async function tryStreamWithFallback(
  models: string[],
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<{
  generator: AsyncGenerator<string, void, undefined>;
  firstChunk: string;
  abortController: AbortController;
}> {
  let lastError = "";

  for (let i = 0; i < models.length; i++) {
    const modelToTry = models[i];
    const abortController = new AbortController();
    const gen = streamChat(messages, modelToTry, abortController.signal);

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

/**
 * Generate a short summary reply for a revision (using a lightweight model).
 */
export async function generateSummaryReply(userMessage: string): Promise<string> {
  try {
    return await completeChat(
      [
        {
          role: "system",
          content:
            "Kamu adalah asisten AI. User baru saja meminta revisi dokumen PRD dengan prompt berikut. Buatlah 1-2 kalimat balasan ringkas untuk memberitahu user bahwa PRD telah berhasil diperbarui sesuai instruksinya. Sebutkan secara spesifik apa yang diubah berdasarkan promptnya (misal: 'PRD telah diperbarui dengan mengintegrasikan Insforge sebagai backend...'). Gunakan bahasa Indonesia yang profesional dan natural. JANGAN menyertakan markdown, format PRD, atau teks panjang.",
        },
        { role: "user", content: userMessage },
      ],
      "meta/llama-3.1-8b-instruct",
    );
  } catch (e) {
    console.error("Failed to generate summary message", e);
    return "PRD berhasil diperbarui.";
  }
}
