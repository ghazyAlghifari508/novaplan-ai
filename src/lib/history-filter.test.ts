import { expect, test } from "vitest";
import { filterHistory, paginate } from "@/lib/history-filter";
const items = [
  { id: "1", name: "Toko Online", step: "prd", preview: "marketplace", updatedAt: new Date() },
  { id: "2", name: "Habit Tracker", step: "ac", preview: "habit", updatedAt: new Date() },
];
test("filter by query", () => {
  expect(filterHistory(items as any, "toko", null)).toHaveLength(1);
});
test("filter by step", () => {
  expect(filterHistory(items as any, "", "ac")).toHaveLength(1);
});
test("paginate", () => {
  expect(paginate(items as any, 1, 1)).toHaveLength(1);
});
