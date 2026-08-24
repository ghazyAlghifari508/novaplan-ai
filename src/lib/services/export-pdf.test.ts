import { expect, test } from "vitest";
import { generatePdfBuffer } from "@/lib/services/export-pdf";
test("pdf buffer non-empty", async () => {
  const buf = await generatePdfBuffer({ content: "# Hello\nWorld", projectName: "Test" });
  expect(buf.length).toBeGreaterThan(100);
});
