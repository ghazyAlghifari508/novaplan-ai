import { describe, expect, it } from "vitest";
import {
	DEFAULT_LANGUAGE,
	getLanguageDirective,
	normalizeLanguage,
	SUPPORTED_LANGUAGES,
} from "./language";

describe("normalizeLanguage", () => {
	it("returns 'en' when input is 'en'", () => {
		expect(normalizeLanguage("en")).toBe("en");
	});

	it("returns 'id' when input is 'id'", () => {
		expect(normalizeLanguage("id")).toBe("id");
	});

	it("defaults to 'id' for undefined, null, or unknown strings", () => {
		expect(normalizeLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
		expect(normalizeLanguage(null)).toBe(DEFAULT_LANGUAGE);
		expect(normalizeLanguage("fr")).toBe(DEFAULT_LANGUAGE);
		expect(normalizeLanguage("")).toBe(DEFAULT_LANGUAGE);
	});
});

describe("SUPPORTED_LANGUAGES", () => {
	it("contains both id and en with labels and flags", () => {
		expect(SUPPORTED_LANGUAGES).toHaveLength(2);
		expect(SUPPORTED_LANGUAGES.map((l) => l.id)).toEqual(["id", "en"]);
	});
});

describe("getLanguageDirective", () => {
	it("generates English directive when lang is 'en'", () => {
		const directive = getLanguageDirective("en");
		expect(directive).toContain("OUTPUT LANGUAGE DIRECTIVE");
		expect(directive).toContain("English");
		expect(directive).toContain("technical");
	});

	it("generates Indonesian directive when lang is 'id'", () => {
		const directive = getLanguageDirective("id");
		expect(directive).toContain("OUTPUT LANGUAGE DIRECTIVE");
		expect(directive).toContain("Bahasa Indonesia");
		expect(directive).toContain("istilah teknis");
	});

	it("defaults to Indonesian directive when lang is empty/null", () => {
		const directive = getLanguageDirective(null);
		expect(directive).toContain("Bahasa Indonesia");
	});
});
