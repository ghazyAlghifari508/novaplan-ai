import { describe, it, expect } from "vitest";
import { cn, formatDate, formatCurrency, generateShareToken, clamp } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("formatDate", () => {
  it("formats date string in Indonesian", () => {
    const result = formatDate("2026-01-15");
    expect(result).toContain("Januari");
    expect(result).toContain("2026");
  });
});

describe("formatCurrency", () => {
  it("formats IDR", () => {
    const result = formatCurrency(25000);
    expect(result).toContain("Rp");
    expect(result).toContain("25.000");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("Rp");
    expect(result).toContain("0");
  });
});

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

describe("clamp", () => {
  it("clamps value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});