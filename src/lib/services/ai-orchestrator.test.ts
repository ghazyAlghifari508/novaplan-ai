import { describe, expect, it } from "vitest";
import { ALL_MODELS } from "@/lib/model-config";
import { selectModels } from "./ai-orchestrator";

describe("selectModels", () => {
  it("unlocks pro and free models for hengker users", () => {
    const models = selectModels("hengker");

    const proModel = ALL_MODELS.find((model) => model.tier === "pro")?.id;
    const freeModel = ALL_MODELS.find((model) => model.tier === "free")?.id;

    expect(models[0]).toBe(ALL_MODELS.find((model) => model.tier === "hengker")?.id);
    expect(models).toContain(proModel);
    expect(models).toContain(freeModel);
  });

  it("prioritizes an unlocked pro model requested by a hengker user", () => {
    const proModel = ALL_MODELS.find((model) => model.tier === "pro")?.id;

    expect(selectModels("hengker", proModel)[0]).toBe(proModel);
  });

  it("does not allow free users to request paid models", () => {
    const proModel = ALL_MODELS.find((model) => model.tier === "pro")?.id;

    expect(selectModels("free", proModel)).not.toContain(proModel);
  });
});
