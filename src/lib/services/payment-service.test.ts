import { describe, expect, it } from "vitest";
import { creditsForPlan, planFromAmount } from "./payment-service";

describe("planFromAmount", () => {
	it("maps the Pro price to the pro plan", () => {
		expect(planFromAmount(49000)).toBe("pro");
	});

	it("maps the Hengker price to the hengker plan", () => {
		expect(planFromAmount(149000)).toBe("hengker");
	});

	it("throws on an amount matching no plan", () => {
		expect(() => planFromAmount(12345)).toThrow(
			/does not match any plan price/,
		);
	});
});

describe("creditsForPlan", () => {
	it("returns the tier credit grant", () => {
		expect(creditsForPlan("pro")).toBe(30);
		expect(creditsForPlan("hengker")).toBe(105);
	});
});

describe("monthly model price mapping (regression)", () => {
	it("still maps sandbox amounts to plans after the monthly rewrite", () => {
		expect(planFromAmount(49000)).toBe("pro");
		expect(planFromAmount(149000)).toBe("hengker");
		expect(creditsForPlan("pro")).toBe(30);
		expect(creditsForPlan("hengker")).toBe(105);
		expect(creditsForPlan("free")).toBe(2);
	});
});
