/**
 * prdfy kanban — show kanban table
 */

import chalk from "chalk";
import { apiGet } from "../lib/api-client.js";

interface TaskCard {
	id: string;
	name: string;
	status: string;
	featureName: string;
	subtaskCount: number;
	subtaskCompleted: number;
}

interface KanbanColumns {
	pending: TaskCard[];
	in_progress: TaskCard[];
	completed: TaskCard[];
	failed: TaskCard[];
}

export async function kanbanCommand(projectId: string) {
	try {
		const data = await apiGet<{ columns: KanbanColumns }>(
			`/api/v1/projects/${projectId}/kanban`,
		);

		const cols = data.columns;
		const maxLen = Math.max(
			cols.pending.length,
			cols.in_progress.length,
			cols.completed.length,
			cols.failed.length,
		);

		const pad = (s: string, len: number) => s.padEnd(len);

		console.log(chalk.bold("\n  Kanban Board\n"));
		console.log(
			`  ${chalk.gray(pad("BELUM MULAI", 22))} ${chalk.gray(pad("DIKERJAKAN", 22))} ${chalk.gray(pad("SELESAI", 22))} ${chalk.gray(pad("GAGAL", 22))}`,
		);
		console.log(
			`  ${"─".repeat(22)} ${"─".repeat(22)} ${"─".repeat(22)} ${"─".repeat(22)}`,
		);

		for (let i = 0; i < maxLen; i++) {
			const p = cols.pending[i];
			const ip = cols.in_progress[i];
			const c = cols.completed[i];
			const f = cols.failed[i];

			const pName = p
				? chalk.gray(pad(p.name.slice(0, 20), 20))
				: chalk.gray(pad("", 20));
			const ipName = ip
				? chalk.blue(pad(ip.name.slice(0, 20), 20))
				: chalk.gray(pad("", 20));
			const cName = c
				? chalk.green(pad(c.name.slice(0, 20), 20))
				: chalk.gray(pad("", 20));
			const fName = f
				? chalk.red(pad(f.name.slice(0, 20), 20))
				: chalk.gray(pad("", 20));

			console.log(`  ${pName}  ${ipName}  ${cName}  ${fName}`);
		}

		console.log(
			chalk.dim(
				`\n  Counts: ${cols.pending.length} pending, ${cols.in_progress.length} active, ${cols.completed.length} done, ${cols.failed.length} failed\n`,
			),
		);
	} catch (err) {
		console.error(
			chalk.red(`Error: ${err instanceof Error ? err.message : err}`),
		);
		process.exit(1);
	}
}
