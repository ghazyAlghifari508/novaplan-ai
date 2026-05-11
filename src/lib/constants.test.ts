import { describe, it, expect } from "vitest";
import { AI_MODELS, RATE_LIMITS, MAX_CONVERSATION_HISTORY, RATE_LIMIT_WINDOW_MS, STORAGE_BUCKETS } from "./constants";

describe("AI_MODELS", () => {
  it("has primary model", () => {
    expect(AI_MODELS.primary).toBeTruthy();
    expect(typeof AI_MODELS.primary).toBe("string");
  });

  it("has fallback and premium models", () => {
    expect(AI_MODELS.fallback).toBeTruthy();
    expect(AI_MODELS.premium).toBeTruthy();
  });
});

describe("RATE_LIMITS", () => {
  it("free tier has lowest limit", () => {
    expect(RATE_LIMITS.free).toBe(5);
    expect(RATE_LIMITS.pro).toBeGreaterThan(RATE_LIMITS.free);
    expect(RATE_LIMITS.hengker).toBeGreaterThan(RATE_LIMITS.pro);
  });
});

describe("constants", () => {
  it("has valid RATE_LIMIT_WINDOW_MS", () => {
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it("has valid MAX_CONVERSATION_HISTORY", () => {
    expect(MAX_CONVERSATION_HISTORY).toBe(20);
  });

  it("has valid STORAGE_BUCKETS", () => {
    expect(STORAGE_BUCKETS.avatars).toBe("avatars");
    expect(STORAGE_BUCKETS.prdFiles).toBe("prd-files");
  });
});