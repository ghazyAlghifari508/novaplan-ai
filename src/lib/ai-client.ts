import { AI_MODELS, CHAT_COMPLETIONS_URL } from "@/lib/constants";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
  model: string;
}

const HEADERS = {
  "Content-Type": "application/json",
};

export async function* streamChat(
  messages: ChatMessage[],
  model?: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const selectedModel = model || AI_MODELS.primary;

  // ponytail: 16384 works with OpenCode Free models — old NVIDIA Llama looped at 16K.
  // 8K was truncating PRDs mid-section-7 (Database Schema) with capable models.
  const requestBody: Record<string, unknown> = {
    model: selectedModel,
    stream: true,
    messages,
    max_tokens: 16384,
    stop: ["<|eot_id|>", "<|end_of_text|>", "===DONE==="],
  };

  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`9Router API error (${response.status}): ${errorText}`);
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
          const parsed: ChatCompletionResponse = JSON.parse(data);
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
    max_tokens: 16384,
    stop: ["<|eot_id|>", "<|end_of_text|>", "===DONE==="],
  };

  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`9Router API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

