/**
 * Config reader/writer for ~/.novaplan/config
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".novaplan");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface CliConfig {
  apiKey?: string;
  apiUrl?: string;
}

export function getConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = getConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2), { mode: 0o600 });
}

export function getApiKey(): string {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("API key not configured. Run: novaplan login");
  }
  return config.apiKey;
}

export function getApiUrl(): string {
  return getConfig().apiUrl || "http://localhost:3000";
}
