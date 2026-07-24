/**
 * novaplan task list / novaplan task update
 */

import chalk from "chalk";
import { apiGet, apiPost } from "../lib/api-client.js";

export async function taskListCommand(projectId: string, options: { status?: string }) {
  try {
    const qs = options.status ? `?status=${options.status}` : "";
    const data = await apiGet<{ tasks: Array<{ id: string; name: string; status: string; featureName: string }> }>(
      `/api/v1/projects/${projectId}/tasks${qs}`
    );

    if (data.tasks.length === 0) {
      console.log(chalk.yellow("No tasks found."));
      return;
    }

    console.log(chalk.bold(`\nTasks (${data.tasks.length}):\n`));
    for (const t of data.tasks) {
      const statusColor =
        t.status === "completed" ? chalk.green :
        t.status === "in_progress" ? chalk.blue :
        t.status === "failed" ? chalk.red : chalk.gray;
      console.log(`  ${statusColor(t.status.padEnd(12))} ${chalk.white(t.name)} ${chalk.dim(`[${t.featureName}]`)}`);
    }
    console.log();
  } catch (err) {
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}

export async function taskUpdateCommand(taskId: string, options: { status: string }) {
  try {
    const result = await apiPost<{ id: string; status: string }>(
      `/api/v1/tasks/${taskId}/status`,
      { status: options.status }
    );
    console.log(chalk.green(`✓ Task ${result.id} → ${result.status}`));
  } catch (err) {
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}
