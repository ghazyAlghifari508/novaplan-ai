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
  maxTokens = 32768,
): AsyncGenerator<string, void, undefined> {
  const selectedModel = model || AI_MODELS.primary;

  // ponytail: default 32768 fits PRD's 8 sections incl. ERD mermaid diagram.
  // AC generation passes a higher maxTokens (docs/contoh-ac need far denser
  // per-section tables/examples). Model supports up to 384000 maxOutput
  // (DeepSeek V4 Flash / hengker default), so headroom is ample either way.
  const requestBody: Record<string, unknown> = {
    model: selectedModel,
    stream: true,
    messages,
    max_tokens: maxTokens,
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
    max_tokens: 32768,
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

