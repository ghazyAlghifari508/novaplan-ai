import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("quota (smoke test)", () => {
  it("exports checkQuota and incrementPrdCount", async () => {
    const mod = await import("./quota");
    expect(mod.checkQuota).toBeDefined();
    expect(mod.incrementPrdCount).toBeDefined();
    expect(mod.checkRevisionQuota).toBeDefined();
  });
});