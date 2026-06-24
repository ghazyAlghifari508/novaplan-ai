import { useEffect, useState } from "react";

export type PendingPrdPromptMode = "auto" | "chat";

const SETUP_PROMPT_KEY = "novaplan:setup-prompt";
const PRD_PROMPT_KEY = "novaplan:prd-prompt";

/** Setup prompt expires after 5 minutes to prevent stale prompts */
const SETUP_PROMPT_MAX_AGE_MS = 5 * 60 * 1000;

interface SetupPromptPayload {
  prompt: string;
  createdAt: number;
}

interface PendingPrdPrompt {
  prompt: string;
  mode: PendingPrdPromptMode;
  createdAt: number;
  /** Original user message for display in chat bubble (without template/tags) */
  displayMessage?: string;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function saveSetupPrompt(prompt: string) {
  const payload: SetupPromptPayload = {
    prompt,
    createdAt: Date.now(),
  };
  getStorage()?.setItem(SETUP_PROMPT_KEY, JSON.stringify(payload));
}

/**
 * Read-only access to the setup prompt (does NOT consume it).
 * Returns empty string if missing or expired.
 */
export function getSetupPrompt(): string {
  const storage = getStorage();
  const raw = storage?.getItem(SETUP_PROMPT_KEY);
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as Partial<SetupPromptPayload>;
    if (!parsed.prompt) return "";

    // Reject expired prompts
    if (parsed.createdAt && Date.now() - parsed.createdAt > SETUP_PROMPT_MAX_AGE_MS) {
      storage?.removeItem(SETUP_PROMPT_KEY);
      return "";
    }

    return parsed.prompt;
  } catch {
    // Backward compat: raw string from old saveSetupPrompt (pre-expiry)
    // Treat as expired since we can't verify age — clear and reject
    storage?.removeItem(SETUP_PROMPT_KEY);
    return "";
  }
}

/**
 * Read and DELETE the setup prompt in one call (consume pattern).
 * Returns empty string if missing or expired.
 * After this call, the prompt is gone from sessionStorage.
 */
export function consumeSetupPrompt(): string {
  const prompt = getSetupPrompt();
  getStorage()?.removeItem(SETUP_PROMPT_KEY);
  return prompt;
}

export function savePendingPrdPrompt(prompt: string, mode: PendingPrdPromptMode, displayMessage?: string) {
  const payload: PendingPrdPrompt = {
    prompt,
    mode,
    createdAt: Date.now(),
    displayMessage,
  };

  getStorage()?.setItem(PRD_PROMPT_KEY, JSON.stringify(payload));
}

export function consumePendingPrdPrompt(): PendingPrdPrompt | null {
  const storage = getStorage();
  const raw = storage?.getItem(PRD_PROMPT_KEY);
  if (!storage || !raw) return null;

  storage.removeItem(PRD_PROMPT_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPrdPrompt>;
    if (!parsed.prompt || !parsed.mode) return null;

    return {
      prompt: parsed.prompt,
      mode: parsed.mode,
      createdAt: parsed.createdAt || Date.now(),
      displayMessage: parsed.displayMessage,
    };
  } catch {
    return null;
  }
}
