import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/insforge/server", () => ({
  createClient: vi.fn(),
}));

describe("auth (client-safe unit)", () => {
  it("module can be imported without crashing", async () => {
    const mod = await import("./auth");
    expect(mod.getUser).toBeDefined();
    expect(mod.requireAuth).toBeDefined();
    expect(mod.getUserProfile).toBeDefined();
    expect(mod.getUserQuota).toBeDefined();
    expect(mod.getUserPlan).toBeDefined();
  });
});