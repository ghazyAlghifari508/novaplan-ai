"use client";

import { useQuery } from "@tanstack/react-query";

export interface TaskCard {
	id: string;
	type: "task" | "subtask";
	parentId?: string;
	featureName: string;
	name: string;
	description: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	subtaskCount?: number;
	subtaskCompleted?: number;
	subtasks?: Array<{ name: string; status: string }>;
	dependencies: string[];
	startedAt: string | null;
	completedAt: string | null;
}

export interface KanbanData {
	columns: {
		pending: TaskCard[];
		in_progress: TaskCard[];
		completed: TaskCard[];
		failed: TaskCard[];
	};
	staleness: "live" | "stale" | "disconnected";
	lastUpdateAt: string;
	acChanged?: boolean;
	taskStatus?: string;
}

interface UseKanbanTasksOptions {
	projectId: string;
	intervalMs?: number;
	enabled?: boolean;
}

export function useKanbanTasks({
	projectId,
	intervalMs = 10_000,
	enabled = true,
}: UseKanbanTasksOptions) {
	const query = useQuery<KanbanData>({
		queryKey: ["kanban-tasks", projectId],
		queryFn: async () => {
			const res = await fetch(`/api/kanban/${projectId}`);
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
			return res.json() as Promise<KanbanData>;
		},
		refetchInterval: intervalMs,
		refetchOnWindowFocus: true,
		staleTime: 5_000,
		enabled: enabled && !!projectId,
	});

	const staleness: "live" | "stale" | "disconnected" =
		query.data?.staleness ?? (query.isError ? "disconnected" : "live");

	return {
		data: query.data ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		error:
			query.error instanceof Error
				? query.error
				: query.error
					? new Error(String(query.error))
					: null,
		staleness,
		refetch: async () => {
			await query.refetch();
		},
	};
}
