/**
 * MCP tool definitions for NovaPlan.
 * 5 tools: get_project_data, update_task_status, update_subtask_status, list_tasks, get_kanban_state.
 */

import * as z from "zod";
import {
  getProjectData,
  listTasks,
  updateTaskStatus,
  updateSubtaskStatus,
  getKanbanState,
} from "./client.js";

export const MCP_TOOLS = [
  {
    name: "get_project_data",
    description:
      "Get full project data including PRD, AC, features, tasks, and sitemap",
    inputSchema: z.object({
      projectId: z.string().describe("Project UUID"),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const data = await getProjectData(projectId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  },
  {
    name: "update_task_status",
    description:
      "Update task status (in_progress, completed, or failed)",
    inputSchema: z.object({
      taskId: z.string().describe("Task UUID"),
      status: z
        .enum(["in_progress", "completed", "failed"])
        .describe("New status"),
      message: z
        .string()
        .optional()
        .describe("Optional message (e.g. failure reason)"),
    }),
    handler: async ({
      taskId,
      status,
      message,
    }: {
      taskId: string;
      status: string;
      message?: string;
    }) => {
      const result = await updateTaskStatus(taskId, status, message);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "update_subtask_status",
    description:
      "Update subtask status (in_progress, completed, or failed)",
    inputSchema: z.object({
      subtaskId: z.string().describe("Subtask UUID"),
      status: z
        .enum(["in_progress", "completed", "failed"])
        .describe("New status"),
      message: z.string().optional().describe("Optional message"),
    }),
    handler: async ({
      subtaskId,
      status,
      message,
    }: {
      subtaskId: string;
      status: string;
      message?: string;
    }) => {
      const result = await updateSubtaskStatus(subtaskId, status, message);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "list_tasks",
    description:
      "List all tasks for a project, optionally filtered by status",
    inputSchema: z.object({
      projectId: z.string().describe("Project UUID"),
      status: z
        .enum(["pending", "in_progress", "completed", "failed"])
        .optional()
        .describe("Filter by status"),
    }),
    handler: async ({
      projectId,
      status,
    }: {
      projectId: string;
      status?: string;
    }) => {
      const result = await listTasks(projectId, status);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "get_kanban_state",
    description: "Get current kanban state for a project",
    inputSchema: z.object({
      projectId: z.string().describe("Project UUID"),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const data = await getKanbanState(projectId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  },
];
