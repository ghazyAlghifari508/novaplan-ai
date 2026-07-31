"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  subtasks?: Array<{ id: string; name: string; status: string }>;
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
}

interface UseKanbanPollingOptions {
  projectId: string;
  intervalMs?: number; // default 10000 (10s)
  enabled?: boolean; // default true
}

interface UseKanbanPollingReturn {
  data: KanbanData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  staleness: "live" | "stale" | "disconnected";
  refetch: () => Promise<void>;
}

export function useKanbanPolling({
  projectId,
  intervalMs = 10000,
  enabled = true,
}: UseKanbanPollingOptions): UseKanbanPollingReturn {
  const [data, setData] = useState<KanbanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [staleness, setStaleness] = useState<"live" | "stale" | "disconnected">("live");

  const errorCountRef = useRef(0);
  const currentIntervalRef = useRef(intervalMs);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Core fetch function
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/kanban/${projectId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const fetched: KanbanData = await res.json();

      setData(fetched);
      setIsError(false);
      setError(null);

      // Reset backoff on success
      errorCountRef.current = 0;
      currentIntervalRef.current = intervalMs;
      setStaleness("live");
    } catch (err: any) {
      console.error("Polling fetch error:", err);
      errorCountRef.current += 1;

      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));

      // Increase staleness based on error count
      if (errorCountRef.current >= 10) {
        setStaleness("disconnected");
      } else if (errorCountRef.current >= 3) {
        setStaleness("stale");
      }

      // Exponential backoff up to 60s
      currentIntervalRef.current = Math.min(
        intervalMs * Math.pow(2, Math.floor(errorCountRef.current / 2)),
        60000
      );
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [projectId, intervalMs]);

  // Handle Visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Pause polling
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    } else {
      // Resume polling immediately
      fetchData();
    }
  }, [fetchData]);

  // Main scheduler effect
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch on mount or projectId change
    setIsLoading(true);
    fetchData();

    // Set up polling loop
    const scheduleNextPoll = () => {
      timerIdRef.current = setTimeout(async () => {
        if (!document.hidden) {
          await fetchData();
        }
        scheduleNextPoll();
      }, currentIntervalRef.current);
    };

    scheduleNextPoll();

    // Visibility Listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, handleVisibilityChange, enabled]);

  return {
    data,
    isLoading,
    isError,
    error,
    staleness,
    refetch: fetchData,
  };
}
