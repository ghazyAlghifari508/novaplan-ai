import { describe, expect, it } from "vitest";
import { depthDirective, getDepthTier } from "./prompt-depth";

describe("getDepthTier", () => {
	it("resolves tier from model id, not user plan", () => {
		expect(getDepthTier("oc/ling-3.0-flash-free(high)")).toBe("free");
		expect(getDepthTier("oc/big-pickle")).toBe("free");
		expect(getDepthTier("oc/nemotron-3-ultra-free(high)")).toBe("pro");
		expect(getDepthTier("oc/mimo-v2.5-free")).toBe("pro");
		expect(getDepthTier("oc/deepseek-v4-flash-free(high)")).toBe("hengker");
	});

	it("falls back to free tier for unknown model id", () => {
		expect(getDepthTier("oc/does-not-exist")).toBe("free");
	});
});

describe("depthDirective", () => {
	const kinds = ["prd", "ac", "task"] as const;
	const models = [
		"oc/ling-3.0-flash-free(high)",
		"oc/nemotron-3-ultra-free(high)",
		"oc/deepseek-v4-flash-free(high)",
	];

	it("returns a non-empty directive for every kind and tier", () => {
		for (const kind of kinds) {
			for (const model of models) {
				expect(depthDirective(kind, model).length).toBeGreaterThan(0);
			}
		}
	});

	it("produces a different directive per tier for the same kind", () => {
		for (const kind of kinds) {
			const perTier = models.map((m) => depthDirective(kind, m));
			expect(new Set(perTier).size).toBe(3);
		}
	});

	it("keeps section structure identical across tiers (depth-only differentiation)", () => {
		const banned =
			/hapus section|skip section|hilangkan section|tambah section baru/i;
		for (const kind of kinds) {
			for (const model of models) {
				const d = depthDirective(kind, model);
				expect(d).not.toMatch(banned);
				// task output is JSON (no sections), so it asserts structural invariance differently
				expect(d).toMatch(
					/SEMUA section|seluruh section|section tetap|struktur JSON tetap sama/i,
				);
			}
		}
	});

	it("scales task depth upward from free to hengker", () => {
		expect(depthDirective("task", models[0])).toMatch(/RINGKAS/i);
		expect(depthDirective("task", models[2])).toMatch(/MAKSIMAL|EXHAUSTIVE/i);
	});
});
