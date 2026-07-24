/**
 * Pure utility functions for Kanban board.
 * Extracted for testability — route handlers import these.
 */

export type TaskCardStatus = "pending" | "in_progress" | "completed" | "failed";

export interface TaskCard {
  id: string;
  type: "task" | "subtask";
  parentId?: string;
  featureName: string;
  name: string;
  description: string;
  status: TaskCardStatus;
  subtaskCount?: number;
  subtaskCompleted?: number;
  subtasks?: Array<{ id: string; name: string; status: string }>;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Group a flat array of TaskCards into columns by status.
 */
export function groupCardsByStatus(
  cards: TaskCard[]
): Record<TaskCardStatus, TaskCard[]> {
  const columns: Record<TaskCardStatus, TaskCard[]> = {
    pending: [],
    in_progress: [],
    completed: [],
    failed: [],
  };

  for (const card of cards) {
    const key = card.status;
    if (columns[key]) {
      columns[key].push(card);
    } else {
      columns.pending.push(card);
    }
  }

  return columns;
}

/**
 * Group cards by feature name within a column.
 */
export function groupCardsByFeature(
  cards: TaskCard[]
): Record<string, TaskCard[]> {
  const groups: Record<string, TaskCard[]> = {};
  for (const card of cards) {
    const name = card.featureName || "Umum";
    if (!groups[name]) groups[name] = [];
    groups[name].push(card);
  }
  return groups;
}

/**
 * Compute task counts per status from a flat list of task cards.
 */
export function computeStatusCounts(
  cards: TaskCard[]
): Record<TaskCardStatus, number> {
  return {
    pending: cards.filter((c) => c.status === "pending").length,
    in_progress: cards.filter((c) => c.status === "in_progress").length,
    completed: cards.filter((c) => c.status === "completed").length,
    failed: cards.filter((c) => c.status === "failed").length,
  };
}

/**
 * Check if AC was updated after task tree generation.
 */
export function detectAcChanged(
  latestAcAt: string | null | undefined,
  tasksCreatedAt: string | null | undefined
): boolean {
  if (!latestAcAt || !tasksCreatedAt) return false;
  return new Date(latestAcAt) > new Date(tasksCreatedAt);
}
