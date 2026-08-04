import { describe, expect, it } from "vitest";
import { advanceStep, stepRank, isTruncatedGeneration } from "./flow-progress";

describe("stepRank", () => {
  it("ranks the flow in order", () => {
    expect(stepRank("question")).toBeLessThan(stepRank("prd"));
    expect(stepRank("prd")).toBeLessThan(stepRank("ac"));
    expect(stepRank("ac")).toBeLessThan(stepRank("task"));
  });

  it("treats null/unknown as prd, matching stepToRoute's fallback", () => {
    expect(stepRank(null)).toBe(stepRank("prd"));
    expect(stepRank(undefined)).toBe(stepRank("prd"));
    expect(stepRank("bogus")).toBe(stepRank("prd"));
  });
});

describe("advanceStep", () => {
  it("moves forward", () => {
    expect(advanceStep("prd", "ac")).toBe("ac");
    expect(advanceStep("ac", "task")).toBe("task");
    expect(advanceStep("question", "task")).toBe("task");
  });

  it("never rewinds - regenerating AC after Task keeps step at task", () => {
    // The reported bug: AC regen at 03:49 rewound step 'task' -> 'ac',
    // so History routed to /ac despite 6 saved tasks.
    expect(advanceStep("task", "ac")).toBeNull();
    expect(advanceStep("task", "prd")).toBeNull();
    expect(advanceStep("ac", "prd")).toBeNull();
  });

  it("returns null when already at that step (no write needed)", () => {
    expect(advanceStep("ac", "ac")).toBeNull();
    expect(advanceStep("task", "task")).toBeNull();
  });

  it("advances from a null/legacy step", () => {
    expect(advanceStep(null, "ac")).toBe("ac");
    expect(advanceStep(null, "prd")).toBeNull();
  });
});

describe("isTruncatedGeneration", () => {
  it("rejects output cut off by the token cap", () => {
    expect(isTruncatedGeneration("full doc here", "length")).toBe(true);
  });

  it("rejects aborted output", () => {
    expect(isTruncatedGeneration("partial", "error")).toBe(true);
    expect(isTruncatedGeneration("partial", "other")).toBe(true);
  });

  it("accepts a normally finished generation", () => {
    expect(isTruncatedGeneration("complete doc", "stop")).toBe(false);
  });

  it("rejects content-filtered output", () => {
    expect(isTruncatedGeneration("partial", "content-filter")).toBe(true);
  });

  it("accepts a provider-reported \"unknown\" reason", () => {
    // ponytail: 9router relays reasons the SDK maps to "unknown". Deny-list,
    // not allow-list - an unrecognised reason must not discard a full document.
    expect(isTruncatedGeneration("complete doc", "unknown")).toBe(false);
  });

  it("accepts tool-call termination", () => {
    expect(isTruncatedGeneration("complete doc", "tool-calls")).toBe(false);
  });

  it("accepts when finishReason is unknown but content exists", () => {
    // ponytail: unknown reason is not evidence of truncation - don't discard
    // a generation the user paid for on a missing signal.
    expect(isTruncatedGeneration("complete doc", undefined)).toBe(false);
  });

  it("rejects empty content regardless of reason", () => {
    expect(isTruncatedGeneration("", "stop")).toBe(true);
    expect(isTruncatedGeneration("   ", "stop")).toBe(true);
  });
});
