/**
 * Export-related service for PRD-07.
 * Formats project content for export and generates ZIP archives.
 */

import JSZip from "jszip";
import type { TaskTree } from "./task-service";
import type { SitemapTree } from "./sitemap-service";

/**
 * Format PRD content for export.
 * PRD is already markdown, so just return as-is.
 */
export function formatPrdMarkdown(prdContent: string): string {
  return prdContent;
}

/**
 * Format AC content for export.
 * AC is already markdown, so just return as-is.
 */
export function formatAcMarkdown(acContent: string): string {
  return acContent;
}

/**
 * Format task tree as JSON string.
 */
export function formatTasksJson(taskTree: TaskTree | null): string {
  if (!taskTree) return JSON.stringify({ features: [] }, null, 2);
  return JSON.stringify(taskTree, null, 2);
}

/**
 * Format sitemap tree as JSON string.
 */
export function formatSitemapJson(sitemapTree: SitemapTree | null): string {
  if (!sitemapTree) return JSON.stringify({ pages: [] }, null, 2);
  return JSON.stringify(sitemapTree, null, 2);
}

/**
 * Generate ZIP buffer containing all project artifacts.
 * Files: prd.md, ac.md, tasks.json, sitemap.json
 */
export async function generateZipBuffer(files: {
  prd?: string;
  ac?: string;
  tasks?: string;
  sitemap?: string;
}): Promise<Buffer> {
  const zip = new JSZip();

  if (files.prd) {
    zip.file("prd.md", files.prd);
  }
  if (files.ac) {
    zip.file("ac.md", files.ac);
  }
  if (files.tasks) {
    zip.file("tasks.json", files.tasks);
  }
  if (files.sitemap) {
    zip.file("sitemap.json", files.sitemap);
  }

  // Generate as Node.js Buffer
  const content = await zip.generateAsync({ type: "nodebuffer" });
  return content;
}
