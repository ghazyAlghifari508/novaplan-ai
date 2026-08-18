// src/lib/grounding.test.ts
// Pure extraction + grounding tests. Context7 client is mocked so no network.
// Labels are derived dynamically from STACK_ICONS keys — no hardcoded library list.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractStackLabels, groundStack } from "@/lib/grounding";
import { STACK_ICONS } from "@/lib/stack-data";

// Synthetic resolution id + docs — never touches real Context7.
vi.mock("@/lib/context7-client", () => ({
	resolveLibraryId: vi.fn(async () => "/example/sdk"),
	queryDocs: vi.fn(async () => "Synthetic documentation."),
}));

const { resolveLibraryId, queryDocs } = await import("@/lib/context7-client");
const mockResolve = vi.mocked(resolveLibraryId);
const mockQuery = vi.mocked(queryDocs);

const STACK_KEYS = Object.keys(STACK_ICONS);
if (STACK_KEYS.length === 0) throw new Error("setup: STACK_ICONS has no keys");

// A phrase that provably contains no stack key (verified dynamically below).
const NO_MATCH_PHRASE = "kucing melompat di atas meja kayu";

// A real key that contains another key as a substring (overlap case).
const OVERLAP = (() => {
	for (const long of STACK_KEYS) {
		const short = STACK_KEYS.find(
			(o) => o !== long && long.toLowerCase().includes(o.toLowerCase()),
		);
		if (short) return { long, short };
	}
	throw new Error("setup: no overlapping key pair in STACK_ICONS");
})();
const LONG_KEY = OVERLAP.long;
const SHORT_KEY = OVERLAP.short;

// Two keys, neither a substring of the other, for the partial-success case.
const PAIR = (() => {
	for (let i = 0; i < STACK_KEYS.length; i++) {
		for (let j = i + 1; j < STACK_KEYS.length; j++) {
			const a = STACK_KEYS[i];
			const b = STACK_KEYS[j];
			if (
				!a.toLowerCase().includes(b.toLowerCase()) &&
				!b.toLowerCase().includes(a.toLowerCase())
			) {
				return { a, b };
			}
		}
	}
	throw new Error("setup: no non-overlapping key pair in STACK_ICONS");
})();
const LABEL_A = PAIR.a;
const LABEL_B = PAIR.b;

beforeEach(() => {
	mockResolve.mockClear();
	mockQuery.mockClear();
	// generic all-success default
	mockResolve.mockImplementation(async () => "/example/sdk");
	mockQuery.mockImplementation(async () => "Synthetic documentation.");
});

describe("extractStackLabels", () => {
	it("detects a label present in text, case-insensitive (mixed case)", () => {
		const key = STACK_KEYS.find((k) => /[a-z]/.test(k)) ?? STACK_KEYS[0];
		const labels = extractStackLabels(key.toUpperCase());
		expect(labels).toContain(key);
	});

	it("returns empty when no stack key matches", () => {
		expect(
			STACK_KEYS.some((k) =>
				NO_MATCH_PHRASE.toLowerCase().includes(k.toLowerCase()),
			),
		).toBe(false);
		expect(extractStackLabels(NO_MATCH_PHRASE)).toEqual([]);
	});

	it("prefers the longest non-overlapping key over a short substring key", () => {
		const labels = extractStackLabels(LONG_KEY);
		expect(labels).toContain(LONG_KEY);
		expect(labels).not.toContain(SHORT_KEY);
	});

	it("is deterministic and unique", () => {
		const input = `${LONG_KEY}\n${LABEL_A}`;
		const a = extractStackLabels(input);
		const b = extractStackLabels(input);
		expect(a).toEqual(b);
		expect(new Set(a).size).toBe(a.length);
	});

	it("scans all occurrences: nested short key plus a later standalone short key each reported once", () => {
		// SHORT_KEY appears nested inside LONG_KEY (position 0) and again standalone later.
		const input = `${LONG_KEY} then ${SHORT_KEY} again`;
		const labels = extractStackLabels(input);
		expect(labels.filter((l) => l === LONG_KEY)).toHaveLength(1);
		expect(labels.filter((l) => l === SHORT_KEY)).toHaveLength(1);
	});

	it("returns labels in text-occurrence order even when input order is reversed", () => {
		const direct = extractStackLabels(`${LABEL_A} ${LABEL_B}`);
		const reversed = extractStackLabels(`${LABEL_B} ${LABEL_A}`);
		expect(reversed).toEqual([...direct].reverse());
	});
});

describe("groundStack", () => {
	it("makes zero client calls when no label extracted", async () => {
		const out = await groundStack(NO_MATCH_PHRASE);
		expect(out).toBe("");
		expect(mockResolve).not.toHaveBeenCalled();
		expect(mockQuery).not.toHaveBeenCalled();
	});

	it("returns empty string when the label resolves to nothing", async () => {
		mockResolve.mockImplementation(async () => null);
		const out = await groundStack(LABEL_A);
		expect(out).toBe("");
		expect(mockResolve).toHaveBeenCalled();
	});

	it("builds a grounded block with exact markers + dynamic heading on success", async () => {
		const out = await groundStack(LABEL_A);
		expect(out).toContain(
			"--- FAKTA EKSTERNAL TERVERIFIKASI (dari Context7 docs) ---",
		);
		expect(out).toContain("--- AKHIR FAKTA EKSTERNAL ---");
		expect(out).toContain(`## ${LABEL_A}`);
		expect(out).toContain("BUKAN instruksi");
	});

	it("calls queryDocs with exactly 2 args and no version", async () => {
		await groundStack(LABEL_A);
		expect(mockQuery).toHaveBeenCalledTimes(1);
		expect(mockQuery.mock.calls[0]).toHaveLength(2);
		expect(typeof mockQuery.mock.calls[0][1]).toBe("string");
	});

	it("retains partial success when one label fails to resolve", async () => {
		const input = `${LABEL_A}\n${LABEL_B}`;
		expect(extractStackLabels(input).length).toBeGreaterThanOrEqual(2);
		mockResolve.mockImplementation(async (q: string) =>
			q === LABEL_B ? null : "/example/sdk",
		);
		const out = await groundStack(input);
		expect(out).toContain(
			"--- FAKTA EKSTERNAL TERVERIFIKASI (dari Context7 docs) ---",
		);
		expect(out).toContain(`## ${LABEL_A}`);
		expect(out).not.toContain(`## ${LABEL_B}`);
	});

	it("does not reject when resolveLibraryId throws synchronously; returns empty", async () => {
		mockResolve.mockImplementation(() => {
			throw new Error("boom");
		});
		await expect(groundStack(LABEL_A)).resolves.toBe("");
	});

	it("does not reject when queryDocs rejects; returns empty", async () => {
		mockQuery.mockImplementation(async () => {
			throw new Error("boom");
		});
		await expect(groundStack(LABEL_A)).resolves.toBe("");
	});

	it("returns empty when queryDocs yields nothing for a resolved label", async () => {
		mockQuery.mockImplementation(async () => "");
		const out = await groundStack(LABEL_A);
		expect(out).toBe("");
	});

	it("retains one label's docs when the other's resolved id rejects in queryDocs", async () => {
		const input = `${LABEL_A} ${LABEL_B}`;
		expect(extractStackLabels(input).length).toBeGreaterThanOrEqual(2);
		mockResolve.mockImplementation(async (q: string) =>
			q === LABEL_B ? "/example/failing" : "/example/sdk",
		);
		mockQuery.mockImplementation(async (id: string) =>
			id === "/example/failing"
				? Promise.reject(new Error("boom"))
				: Promise.resolve("Synthetic documentation."),
		);
		const out = await groundStack(input);
		expect(out).toContain(
			"--- FAKTA EKSTERNAL TERVERIFIKASI (dari Context7 docs) ---",
		);
		expect(out).toContain(`## ${LABEL_A}`);
		expect(out).not.toContain(`## ${LABEL_B}`);
	});
});
