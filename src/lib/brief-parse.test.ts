import { expect, test } from "vitest";
import { truncateBrief } from "@/lib/brief-parse";
test("truncate 6000 chars to 5000", () => {
  const s = "a".repeat(6000);
  const { text, truncated } = truncateBrief(s);
  expect(text.length).toBe(5000);
  expect(truncated).toBe(true);
});
