import { describe, expect, it } from "vitest";
import { depthDirective } from "./prompt-depth";

describe("depthDirective", () => {
	const kinds = ["prd", "ac", "task"] as const;

	it("returns a non-empty directive for every kind", () => {
		for (const kind of kinds) {
			expect(depthDirective(kind).length).toBeGreaterThan(0);
		}
	});

	it("always returns the maximal (exhaustive) depth, not a reduced tier", () => {
		for (const kind of kinds) {
			expect(depthDirective(kind)).toMatch(/MAKSIMAL|EXHAUSTIVE/i);
			// Reduced-tier markers must never appear now that all tiers share one directive.
			expect(depthDirective(kind)).not.toMatch(/RINGKAS|STANDAR/i);
		}
	});

	it("keeps section structure identical (depth-only, no section removal)", () => {
		const banned =
			/hapus section|skip section|hilangkan section|tambah section baru/i;
		for (const kind of kinds) {
			const d = depthDirective(kind);
			expect(d).not.toMatch(banned);
			expect(d).toMatch(
				/SEMUA section|seluruh section|section tetap|struktur JSON tetap sama/i,
			);
		}
	});
});
