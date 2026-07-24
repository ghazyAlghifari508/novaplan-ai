/**
 * NovaPlan API client for MCP server.
 * Wraps fetch calls to NovaPlan REST API v1.
 */

const API_URL = process.env.NOVAPLAN_API_URL || "https://novaplan.vercel.app";
const API_KEY = process.env.NOVAPLAN_API_KEY || "";

if (!API_KEY) {
  console.error("NOVAPLAN_API_KEY environment variable is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function getProjectData(projectId: string) {
  return apiFetch<Record<string, unknown>>(`/api/v1/projects/${projectId}`);
}

export async function listTasks(projectId: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<{ tasks: Array<Record<string, unknown>> }>(
    `/api/v1/projects/${projectId}/tasks${qs}`
  );
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
  message?: string
) {
  return apiFetch<{ id: string; status: string; updatedAt: string }>(
    `/api/v1/tasks/${taskId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, message }),
    }
  );
}

export async function updateSubtaskStatus(
  subtaskId: string,
  status: string,
  message?: string
) {
  return apiFetch<{ id: string; status: string; updatedAt: string }>(
    `/api/v1/subtasks/${subtaskId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, message }),
    }
  );
}

export async function getKanbanState(projectId: string) {
  return apiFetch<Record<string, unknown>>(
    `/api/v1/projects/${projectId}/kanban`
  );
}
