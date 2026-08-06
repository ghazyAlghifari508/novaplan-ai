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
 * Mutable box the caller passes in to learn WHY the stream ended.
 *
 * ponytail: an out-param, not a return value - streamChat is a generator, so
 * its return channel is already spoken for, and callers only need the reason
 * after the loop drains. Consumed by isTruncatedGeneration in lib/flow-progress
 * to decide whether a generation is safe to persist.
 */
export interface StreamOutcome {
  finishReason?: string;
}

/**
 * Stream chat completion as an AsyncGenerator<string>.
 * Preserves the old raw-fetch streamChat signature so ai-orchestrator + all
 * 5 AI routes port unchanged; `outcome` is optional and additive.
 */
export async function* streamChat(
  messages: ChatMessage[],
  model?: string,
  signal?: AbortSignal,
  maxTokens = 32768,
  outcome?: StreamOutcome,
  onThinking?: (text: string) => void,
): AsyncGenerator<string, void, undefined> {
  const result = streamText({
    // ponytail: provider.chat(), not provider(). The v5 default routes to the
    // Responses API, whose stream 9router answers with a chat-completions body;
    // the mismatch makes the SDK report finishReason "other" on a stream that
    // finished cleanly ("stop" on the wire), and isTruncatedGeneration then
    // discards a complete document. .chat() pins /v1/chat/completions.
    model: provider.chat(model || "oc/big-pickle"),
    messages,
    allowSystemInMessages: true,
    abortSignal: signal,
    maxOutputTokens: maxTokens,
    stopSequences: ["<|eot_id|>", "<|end_of_text|>", "===DONE==="],
  });

  try {
    for await (const chunk of result.fullStream) {
      if (chunk.type === "reasoning-delta") {
        onThinking?.((chunk as { type: "reasoning-delta"; text: string }).text ?? "");
        continue;
      }
      if (chunk.type === "text-delta") {
        if (!chunk.text) continue;
        yield chunk.text;
      }
    }
  } catch (err) {
    // A dropped/aborted stream is exactly the case that used to persist a
    // partial document as a new version. Mark it before rethrowing.
    if (outcome) outcome.finishReason = "error";
    throw err;
  }

  if (outcome) {
    // ponytail: PromiseLike, not Promise - no .catch(), so try/catch it.
    try {
      outcome.finishReason = await result.finishReason;
    } catch {
      outcome.finishReason = "error";
    }
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
    model: provider.chat(model || "oc/big-pickle"),
    messages,
    allowSystemInMessages: true,
  });
  return text;
}
