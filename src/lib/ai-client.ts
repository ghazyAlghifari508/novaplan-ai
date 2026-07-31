/**
 * 9router AI client - Vercel AI SDK v7 streamText + @ai-sdk/openai.
 * 9router exposes an OpenAI-compatible /v1/chat/completions (local, no API key).
 *
 * ponytail: apiKey must be non-empty for createOpenAI (it asserts), but 9router
 * ignores it - send a dummy. If a key is ever required, set 9ROUTER_API_KEY.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { ROUTER_BASE_URL } from "@/lib/constants";

const provider = createOpenAI({
  baseURL: ROUTER_BASE_URL,
  apiKey: process.env.NINE_ROUTER_API_KEY || "nine-router-local",
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Stream chat completion as an AsyncGenerator<string>.
 * Preserves the old raw-fetch streamChat signature so ai-orchestrator + all
 * 5 AI routes port unchanged.
 */
export async function* streamChat(
  messages: ChatMessage[],
  model?: string,
  signal?: AbortSignal,
  maxTokens = 32768,
): AsyncGenerator<string, void, undefined> {
  const result = streamText({
    model: provider(model || "oc/ling-3.0-flash-free(high)"),
    messages,
    allowSystemInMessages: true,
    abortSignal: signal,
    maxOutputTokens: maxTokens,
    stopSequences: ["<|eot_id|>", "<|end_of_text|>", "===DONE==="],
  });

  for await (const chunk of result.textStream) {
    if (!chunk) continue;
    yield chunk;
  }
}

/**
 * Non-streaming completion. Mirrors old completeChat signature.
 */
export async function completeChat(
  messages: ChatMessage[],
  model?: string,
): Promise<string> {
  const { text } = await generateText({
    model: provider(model || "oc/ling-3.0-flash-free(high)"),
    messages,
    allowSystemInMessages: true,
  });
  return text;
}
