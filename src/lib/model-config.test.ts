import { describe, expect, it } from "vitest";
import { COMBO_MODEL_ID } from "./model-config";

describe("model-config", () => {
	it("exports COMBO_MODEL_ID as prdfy-combo", () => {
		expect(COMBO_MODEL_ID).toBe("prdfy-combo");
	});

	it("does not export ALL_MODELS", async () => {
		const mod = await import("./model-config");
		expect("ALL_MODELS" in mod).toBe(false);
	});

	it("does not export tier-related symbols", async () => {
		const mod = await import("./model-config");
		expect("TIER_ORDER" in mod).toBe(false);
		expect("TIER_LABELS" in mod).toBe(false);
		expect("isModelUnlocked" in mod).toBe(false);
		expect("getUnlockedModelIds" in mod).toBe(false);
		expect("DEFAULT_MODEL_ID" in mod).toBe(false);
	});
});
