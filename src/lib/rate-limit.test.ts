import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/insforge/server", () => ({
  createClient: vi.fn(),
}));

describe("rate-limit (smoke test)", () => {
  it("exports rate limit functions", async () => {
    const mod = await import("./rate-limit");
    expect(mod.checkRateLimit).toBeDefined();
    expect(mod.recordRequest).toBeDefined();
  });
});