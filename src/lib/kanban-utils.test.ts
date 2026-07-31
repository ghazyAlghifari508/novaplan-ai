import { describe, it, expect } from "vitest";
import {
  groupCardsByStatus,
  groupCardsByFeature,
  computeStatusCounts,
  detectAcChanged,
  type TaskCard,
} from "./kanban-utils";

const mockCard = (overrides: Partial<TaskCard> = {}): TaskCard => ({
  id: "test-id",
  type: "task",
  featureName: "Auth",
  name: "Test Task",
  description: "desc",
  status: "pending",
  dependencies: [],
  startedAt: null,
  completedAt: null,
  ...overrides,
});

describe("kanban-utils", () => {
  describe("groupCardsByStatus", () => {
    it("groups cards by their status column", () => {
      const cards = [
        mockCard({ id: "1", status: "pending" }),
        mockCard({ id: "2", status: "in_progress" }),
        mockCard({ id: "3", status: "completed" }),
        mockCard({ id: "4", status: "failed" }),
        mockCard({ id: "5", status: "pending" }),
      ];

      const columns = groupCardsByStatus(cards);

      expect(columns.pending).toHaveLength(2);
      expect(columns.in_progress).toHaveLength(1);
      expect(columns.completed).toHaveLength(1);
      expect(columns.failed).toHaveLength(1);
    });

    it("returns empty arrays for empty input", () => {
      const columns = groupCardsByStatus([]);
      expect(columns.pending).toHaveLength(0);
      expect(columns.in_progress).toHaveLength(0);
      expect(columns.completed).toHaveLength(0);
      expect(columns.failed).toHaveLength(0);
    });
  });

  describe("groupCardsByFeature", () => {
    it("groups cards by feature name", () => {
      const cards = [
        mockCard({ id: "1", featureName: "Auth" }),
        mockCard({ id: "2", featureName: "Auth" }),
        mockCard({ id: "3", featureName: "Dashboard" }),
      ];

      const groups = groupCardsByFeature(cards);

      expect(groups["Auth"]).toHaveLength(2);
      expect(groups["Dashboard"]).toHaveLength(1);
    });

    it("uses 'Umum' for empty feature name", () => {
      const cards = [mockCard({ id: "1", featureName: "" })];
      const groups = groupCardsByFeature(cards);
      expect(groups["Umum"]).toHaveLength(1);
    });
  });

  describe("computeStatusCounts", () => {
    it("counts cards per status", () => {
      const cards = [
        mockCard({ status: "pending" }),
        mockCard({ status: "pending" }),
        mockCard({ status: "in_progress" }),
        mockCard({ status: "completed" }),
      ];

      const counts = computeStatusCounts(cards);

      expect(counts.pending).toBe(2);
      expect(counts.in_progress).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(0);
    });
  });

  describe("detectAcChanged", () => {
    it("returns true when AC was updated after tasks", () => {
      const result = detectAcChanged("2026-07-21T12:00:00Z", "2026-07-20T10:00:00Z");
      expect(result).toBe(true);
    });

    it("returns false when AC was before tasks", () => {
      const result = detectAcChanged("2026-07-19T10:00:00Z", "2026-07-20T10:00:00Z");
      expect(result).toBe(false);
    });

    it("returns false when either is null", () => {
      expect(detectAcChanged(null, "2026-07-20T10:00:00Z")).toBe(false);
      expect(detectAcChanged("2026-07-20T10:00:00Z", null)).toBe(false);
      expect(detectAcChanged(null, null)).toBe(false);
    });

    it("returns false when either is undefined", () => {
      expect(detectAcChanged(undefined, undefined)).toBe(false);
    });
  });
});
