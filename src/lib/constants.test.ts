import { describe, it, expect } from "vitest";
import { AI_MODELS, RATE_LIMITS, RATE_LIMIT_WINDOW_MS } from "./constants";

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

});