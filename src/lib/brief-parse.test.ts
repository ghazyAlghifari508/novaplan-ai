import { expect, test } from "vitest";
import { parseBriefFile, truncateBrief } from "@/lib/brief-parse";
import { BRIEF_MAX_BYTES } from "@/lib/constants";

test("truncate 6000 chars to 5000", () => {
	const s = "a".repeat(6000);
	const { text, truncated } = truncateBrief(s);
	expect(text.length).toBe(5000);
	expect(truncated).toBe(true);
});
test("reject file > BRIEF_MAX_BYTES", async () => {
	const f = new File([new Uint8Array(BRIEF_MAX_BYTES + 1)], "x.txt");
	await expect(parseBriefFile(f)).rejects.toThrow("File terlalu besar");
});
