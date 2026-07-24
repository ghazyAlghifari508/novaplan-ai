/**
 * novaplan login — save API key to config
 */

import chalk from "chalk";
import { saveConfig } from "../lib/config.js";

export function loginCommand(options: { apiKey?: string; apiUrl?: string }) {
  if (options.apiKey) {
    saveConfig({
      apiKey: options.apiKey,
      apiUrl: options.apiUrl,
    });
    console.log(chalk.green("✓ API key saved successfully."));
    console.log(chalk.dim(`Config: ~/.novaplan/config.json`));
  } else {
    console.log(chalk.yellow("Usage: novaplan login --api-key <key>"));
    console.log(chalk.dim("Get your API key from Settings → API Keys in NovaPlan."));
  }
}
