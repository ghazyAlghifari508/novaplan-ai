/**
 * novaplan subtask update
 */

import chalk from "chalk";
import { apiPost } from "../lib/api-client.js";

export async function subtaskUpdateCommand(subtaskId: string, options: { status: string }) {
  try {
    const result = await apiPost<{ id: string; status: string }>(
      `/api/v1/subtasks/${subtaskId}/status`,
      { status: options.status }
    );
    console.log(chalk.green(`✓ Subtask ${result.id} → ${result.status}`));
  } catch (err) {
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}
