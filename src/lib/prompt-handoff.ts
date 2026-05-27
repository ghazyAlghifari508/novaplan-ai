import { useEffect, useState } from "react";

export type PendingPrdPromptMode = "auto" | "chat";

const SETUP_PROMPT_KEY = "novaplan:setup-prompt";
const PRD_PROMPT_KEY = "novaplan:prd-prompt";

interface PendingPrdPrompt {
  prompt: string;
  mode: PendingPrdPromptMode;
  createdAt: number;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function saveSetupPrompt(prompt: string) {
  getStorage()?.setItem(SETUP_PROMPT_KEY, prompt);
}

export function getSetupPrompt() {
  return getStorage()?.getItem(SETUP_PROMPT_KEY) || "";
}

export function useClientPrompt() {
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    setPrompt(getSetupPrompt());
  }, []);

  return prompt;
}

export function savePendingPrdPrompt(prompt: string, mode: PendingPrdPromptMode) {
  const payload: PendingPrdPrompt = {
    prompt,
    mode,
    createdAt: Date.now(),
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
    };
  } catch {
    return null;
  }
}
