/**
 * Sitemap-related database operations.
 * Handles sitemap_pages (self-referential parent_id) CRUD + tree reconstruction.
 */

// ponytail: InsForge SDK belum expose client types. Ganti saat tersedia.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsForgeClient = any;

interface SitemapRow {
  id: string;
  parent_id: string | null;
  path: string;
  name: string;
  is_auth_required: boolean | null;
  order: number;
}

export interface SitemapPage {
  name: string;
  path: string;
  isAuthRequired: boolean;
  children: SitemapPage[];
}

export interface SitemapTree {
  pages: SitemapPage[]; // root pages (usually 1: Home)
}

/**
 * Parse AI-generated JSON into SitemapTree.
 * Rejects empty pages array so callers surface an error (no false success).
 */
export function parseSitemapJson(jsonString: string): SitemapTree | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return null;
    }

    const validatePage = (page: Record<string, unknown>): SitemapPage | null => {
      if (!page.name || typeof page.path !== "string") return null;
      const children: SitemapPage[] = [];
      if (Array.isArray(page.children)) {
        for (const child of page.children) {
          const validated = validatePage(child);
          if (!validated) return null;
          children.push(validated);
        }
      }
      return {
        name: String(page.name),
        path: String(page.path),
        isAuthRequired: Boolean(page.isAuthRequired),
        children,
      };
    };

    const pages: SitemapPage[] = [];
    for (const page of parsed.pages) {
      const validated = validatePage(page);
      if (!validated) return null;
      pages.push(validated);
    }

    return { pages };
  } catch {
    return null;
  }
}

/**
 * Save sitemap tree to database.
 * Flattens tree into sitemap_pages rows with parent_id links.
 * ponytail: InsForge SDK has no transaction API — delete old then insert new,
 * with compensating delete on partial failure.
 */
export async function saveSitemapTree(
  insforge: InsForgeClient,
  projectId: string,
  tree: SitemapTree,
): Promise<{ success: boolean; error?: string }> {
  const insertedIds: string[] = [];

  try {
    // Clear existing sitemap for this project
    await insforge.database.from("sitemap_pages").delete().eq("project_id", projectId);

    // Recursively insert pages, tracking parent links.
    // Cycle guard: AI could return circular children (A→B→A). Track paths seen
    // on the current root-to-leaf stack; a repeat means malformed input.
    const insertPage = async (
      page: SitemapPage,
      parentId: string | null,
      order: number,
      stack: string[],
    ): Promise<void> => {
      const pathKey = `${page.path}`;
      if (stack.includes(pathKey)) {
        throw new Error(`Circular sitemap reference detected at "${page.path}"`);
      }
      const { data: row, error } = await insforge.database
        .from("sitemap_pages")
        .insert([{
          project_id: projectId,
          parent_id: parentId,
          path: page.path,
          name: page.name,
          is_auth_required: page.isAuthRequired,
          order,
        }])
        .select("id")
        .single();

      if (error) throw error;
      insertedIds.push(row.id);

      const childStack = [...stack, pathKey];
      for (let i = 0; i < page.children.length; i++) {
        await insertPage(page.children[i], row.id, i, childStack);
      }
    };

    for (let i = 0; i < tree.pages.length; i++) {
      await insertPage(tree.pages[i], null, i, []);
    }

    // Update project status
    await insforge.database
      .from("projects")
      .update({ sitemap_status: "completed" })
      .eq("id", projectId);

    return { success: true };
  } catch (error) {
    // Compensating cleanup of partial inserts
    if (insertedIds.length) {
      await insforge.database.from("sitemap_pages").delete().in("id", insertedIds).catch((e: unknown) => console.error("sitemap cleanup failed:", e));
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("saveSitemapTree error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Get sitemap tree for a project.
 * Reconstructs tree from flat sitemap_pages rows (group by parent_id, BFS).
 * Throws on unexpected errors — caller distinguishes error vs empty.
 */
export async function getSitemapTree(
  insforge: InsForgeClient,
  projectId: string,
): Promise<SitemapTree | null> {
  const { data: rows, error } = await insforge.database
    .from("sitemap_pages")
    .select("id, parent_id, path, name, is_auth_required, order")
    .eq("project_id", projectId)
    .order("order", { ascending: true });

  if (error) throw error;
  if (!rows || rows.length === 0) return null;

  // Group rows by parent_id (null = root)
  const byParent = new Map<string | null, any[]>();
  for (const row of rows) {
    const key = row.parent_id as string | null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }

  // Track visited ids to guard against circular parent_id references
  const visited = new Set<string>();

  const buildPage = (row: any): SitemapPage | null => {
    if (visited.has(row.id)) {
      console.warn("Cycle detected in sitemap_pages, skipping id:", row.id);
      return null; // cycle guard
    }
    visited.add(row.id);

    const children: SitemapPage[] = [];
    const childRows = byParent.get(row.id) || [];
    for (const childRow of childRows) {
      const child = buildPage(childRow);
      if (child) children.push(child);
    }

    return {
      name: row.name,
      path: row.path,
      isAuthRequired: Boolean(row.is_auth_required),
      children,
    };
  };

  const rootRows = byParent.get(null) || [];
  const pages: SitemapPage[] = [];
  for (const rootRow of rootRows) {
    const page = buildPage(rootRow);
    if (page) pages.push(page);
  }

  return { pages };
}
