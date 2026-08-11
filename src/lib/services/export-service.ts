/**
 * Export service - pure formatters + ZIP generation.
 * Copied as-is from old project (no InsForge deps).
 */
import JSZip from "jszip";
import type { TaskTree } from "./task-service";

export function formatPrdMarkdown(prdContent: string): string {
	return prdContent;
}

export function formatAcMarkdown(acContent: string): string {
	return acContent;
}

export function formatTasksJson(taskTree: TaskTree | null): string {
	if (!taskTree) return JSON.stringify({ features: [] }, null, 2);
	return JSON.stringify(taskTree, null, 2);
}

export async function generateZipBuffer(files: {
	prd?: string;
	ac?: string;
	tasks?: string;
}): Promise<Buffer> {
	const zip = new JSZip();
	if (files.prd) zip.file("prd.md", files.prd);
	if (files.ac) zip.file("ac.md", files.ac);
	if (files.tasks) zip.file("tasks.json", files.tasks);
	return zip.generateAsync({ type: "nodebuffer" });
}
