import { describe, it, expect } from "vitest";
import { generateShareToken } from "./prd-service";

describe("generateShareToken", () => {
  it("returns a 12 character string", () => {
    const token = generateShareToken();
    expect(token).toHaveLength(12);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateShareToken()));
    expect(tokens.size).toBe(100);
  });
});
