import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, FEATURES } from "./database";

describe("PLAN_LIMITS", () => {
  it("free tier has 3 PRDs and 3 revisions", () => {
    expect(PLAN_LIMITS.free.prd).toBe(3);
    expect(PLAN_LIMITS.free.revision).toBe(3);
  });

  it("pro tier has 25 PRDs and 20 revisions", () => {
    expect(PLAN_LIMITS.pro.prd).toBe(25);
    expect(PLAN_LIMITS.pro.revision).toBe(20);
  });

  it("hengker tier has unlimited", () => {
    expect(PLAN_LIMITS.hengker.prd).toBe(-1);
    expect(PLAN_LIMITS.hengker.revision).toBe(-1);
  });
});

describe("FEATURES", () => {
  it("free tier has no PDF, no share, no API", () => {
    expect(FEATURES.free.downloadPdf).toBe(false);
    expect(FEATURES.free.shareLink).toBe(false);
    expect(FEATURES.free.apiAccess).toBe(false);
  });

  it("pro tier has PDF and share", () => {
    expect(FEATURES.pro.downloadPdf).toBe(true);
    expect(FEATURES.pro.shareLink).toBe(true);
    expect(FEATURES.pro.apiAccess).toBe(false);
  });

  it("hengker tier has everything", () => {
    expect(FEATURES.hengker.downloadPdf).toBe(true);
    expect(FEATURES.hengker.apiAccess).toBe(true);
    expect(FEATURES.hengker.customTemplate).toBe(true);
    expect(FEATURES.hengker.priorityQueue).toBe(true);
  });
});