import { describe, it, expect } from "vitest";
import {
  formatPrdMarkdown,
  formatAcMarkdown,
  formatTasksJson,
  formatSitemapJson,
  generateZipBuffer,
} from "./export-service";
import JSZip from "jszip";

describe("export-service", () => {
  it("formats content correctly", () => {
    expect(formatPrdMarkdown("prd content")).toBe("prd content");
    expect(formatAcMarkdown("ac content")).toBe("ac content");

    expect(formatTasksJson(null)).toBe(JSON.stringify({ features: [] }, null, 2));
    expect(formatTasksJson({ features: [{ name: "F1", tasks: [] }] })).toContain("F1");

    expect(formatSitemapJson(null)).toBe(JSON.stringify({ pages: [] }, null, 2));
    expect(formatSitemapJson({ pages: [{ name: "Home", path: "/", isAuthRequired: false, children: [] }] })).toContain("Home");
  });

  it("generates valid ZIP buffer", async () => {
    const buffer = await generateZipBuffer({
      prd: "prd doc",
      ac: "ac doc",
      tasks: '{"features":[]}',
      sitemap: '{"pages":[]}',
    });

    expect(buffer).toBeInstanceOf(Buffer);

    // Verify it is a valid zip with JSZip
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.files["prd.md"]).toBeDefined();
    expect(zip.files["ac.md"]).toBeDefined();
    expect(zip.files["tasks.json"]).toBeDefined();
    expect(zip.files["sitemap.json"]).toBeDefined();

    const prdText = await zip.files["prd.md"].async("text");
    expect(prdText).toBe("prd doc");
  });
});
