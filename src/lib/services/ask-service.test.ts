import { describe, expect, it } from "vitest";
import { parseAskOptionsJson } from "./ask-service";

describe("parseAskOptionsJson", () => {
  it("parses a valid question list", () => {
    const result = parseAskOptionsJson(
      JSON.stringify({ questions: [{ id: "target_audience", question: "Siapa target audiens?", options: ["UMKM", "Enterprise"] }] })
    );
    expect(result).toEqual([{ id: "target_audience", question: "Siapa target audiens?", options: ["UMKM", "Enterprise"] }]);
  });

  it("rejects a question with no options", () => {
    expect(parseAskOptionsJson(JSON.stringify({ questions: [{ id: "a", question: "Q?", options: [] }] }))).toBeNull();
  });

  it("rejects non-string options", () => {
    expect(parseAskOptionsJson(JSON.stringify({ questions: [{ id: "a", question: "Q?", options: [1, 2] }] }))).toBeNull();
  });

  it("rejects a missing id", () => {
    expect(parseAskOptionsJson(JSON.stringify({ questions: [{ question: "Q?", options: ["X"] }] }))).toBeNull();
  });

  it("rejects an empty question list", () => {
    expect(parseAskOptionsJson(JSON.stringify({ questions: [] }))).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseAskOptionsJson("not json")).toBeNull();
  });
});
