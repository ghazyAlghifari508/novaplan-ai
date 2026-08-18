import { describe, expect, it } from "vitest";
import { selectModels } from "./ai-orchestrator";

describe("selectModels", () => {
	it("returns array with single combo ID", () => {
		const models = selectModels();
		expect(models).toEqual(["novaplan-combo"]);
	});

	it("accepts no parameters", () => {
		// @ts-expect-error — should have zero params
		expect(() => selectModels("free")).not.toThrow();
	});
});
