/**
 * novaplan login — save API key to config (interactive if no --api-key flag)
 */

import chalk from "chalk";
import { createInterface } from "readline";
import { saveConfig } from "../lib/config.js";

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    process.stdout.write(prompt);

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let input = "";
    const onData = (char: Buffer) => {
      const c = char.toString();
      if (c === "\n" || c === "\r") {
        if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
        stdin.removeListener("data", onData);
        rl.close();
        process.stdout.write("\n");
        resolve(input);
      } else if (c === "\u0003") {
        // Ctrl+C
        process.exit(0);
      } else if (c === "\u007F" || c === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        input += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

export async function loginCommand(options: { apiKey?: string; apiUrl?: string }) {
  try {
    const apiKey = options.apiKey || await promptHidden("Masukkan API key: ");
    if (!apiKey.trim()) {
      console.log(chalk.red("API key tidak boleh kosong."));
      process.exit(1);
    }

    const apiUrl = options.apiUrl || "http://localhost:3000";

    saveConfig({ apiKey: apiKey.trim(), apiUrl });
    console.log(chalk.green("✓ API key berhasil disimpan."));
    console.log(chalk.dim(`Config: ~/.novaplan/config.json`));
    console.log(chalk.dim(`API URL: ${apiUrl}`));
  } catch (err) {
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}
