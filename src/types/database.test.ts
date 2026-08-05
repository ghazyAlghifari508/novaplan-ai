import { describe, it, expect } from "vitest";
import { PLAN_CREDITS, PLAN_PRICES, FEATURES } from "./database";

describe("PLAN_CREDITS", () => {
  it("free gets 2 lifetime credits", () => {
    expect(PLAN_CREDITS.free).toBe(2);
  });

  it("pro gets 10 credits", () => {
    expect(PLAN_CREDITS.pro).toBe(10);
  });

  it("hengker gets 35 credits", () => {
    expect(PLAN_CREDITS.hengker).toBe(35);
  });
});

describe("PLAN_PRICES", () => {
  it("matches the approved one-time price sheet", () => {
    expect(PLAN_PRICES.free).toBe(0);
    expect(PLAN_PRICES.pro).toBe(49000);
    expect(PLAN_PRICES.hengker).toBe(149000);
  });
});

describe("FEATURES", () => {
  it("free is PRD-only, no share", () => {
    expect(FEATURES.free.fullWorkflow).toBe(false);
    expect(FEATURES.free.shareLink).toBe(false);
  });

  it("pro unlocks full workflow + share", () => {
    expect(FEATURES.pro.fullWorkflow).toBe(true);
    expect(FEATURES.pro.shareLink).toBe(true);
  });

  it("hengker adds priority queue", () => {
    expect(FEATURES.hengker.fullWorkflow).toBe(true);
    expect(FEATURES.hengker.priorityQueue).toBe(true);
  });
});
