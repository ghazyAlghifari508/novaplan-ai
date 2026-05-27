import { AI_MODELS, OPENROUTER_API_URL } from "@/lib/constants";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
  model: string;
}

const OPENROUTER_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "HTTP-Referer": "https://novaplan.ai",
  "X-Title": "NovaPlan",
  "Content-Type": "application/json",
};

export async function* streamChat(
  messages: ChatMessage[],
  model?: string | string[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const selectedModel = model || AI_MODELS.primary;

  const requestBody: Record<string, unknown> = {
    stream: true,
    messages,
  };

  if (Array.isArray(selectedModel)) {
    requestBody.models = selectedModel;
  } else {
    requestBody.model = selectedModel;
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: OPENROUTER_HEADERS,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed: OpenRouterResponse = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          continue;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function completeChat(
  messages: ChatMessage[],
  model?: string,
): Promise<string> {
  const selectedModel = model || AI_MODELS.primary;

  const requestBody = {
    model: selectedModel,
    stream: false,
    messages,
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: OPENROUTER_HEADERS,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export type FallbackModel = keyof typeof AI_MODELS;

export async function tryModels(
  messages: ChatMessage[],
  models: string[] = [AI_MODELS.primary, AI_MODELS.fallback],
): Promise<AsyncGenerator<string, void, undefined>> {
  for (const model of models) {
    try {
      return streamChat(messages, model);
    } catch {
      continue;
    }
  }

  throw new Error("All models failed");
}
