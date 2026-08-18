import { describe, expect, it } from "vitest";
import { AI_MODELS, RATE_LIMIT_WINDOW_MS, RATE_LIMITS } from "./constants";

describe("AI_MODELS", () => {
	it("has primary model", () => {
		expect(AI_MODELS.primary).toBeTruthy();
		expect(typeof AI_MODELS.primary).toBe("string");
	});

	it("has fallback and premium models", () => {
		expect(AI_MODELS.fallback).toBeTruthy();
		expect(AI_MODELS.premium).toBeTruthy();
	});

	it("all point to combo model", () => {
		expect(AI_MODELS.primary).toBe("novaplan-combo");
		expect(AI_MODELS.fallback).toBe("novaplan-combo");
		expect(AI_MODELS.premium).toBe("novaplan-combo");
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
