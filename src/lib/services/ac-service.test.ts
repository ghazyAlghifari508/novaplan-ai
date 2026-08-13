import { describe, expect, it } from "vitest";
import { extractFeatureSection } from "./ac-service";

describe("extractFeatureSection", () => {
	const md = `# Acceptance Criteria - Novaplan

## Glossary / Konvensi
Some conventions here.

## Login & Auth
### AC-1.1 Login via Google
Content for login.

### AC-1.2 Logout
More content.

## Dashboard
### AC-2.1 View stats
Dashboard content.
`;

	it("extracts exact heading match", () => {
		const result = extractFeatureSection(md, "Dashboard");
		expect(result).toContain("AC-2.1 View stats");
		expect(result).toContain("Dashboard content.");
	});

	it("matches case-insensitively", () => {
		const result = extractFeatureSection(md, "login & auth");
		expect(result).toContain("AC-1.1 Login via Google");
	});

	it("returns null when no heading matches", () => {
		expect(extractFeatureSection(md, "Nonexistent Feature")).toBeNull();
	});

	it("stops extraction at the next ## heading", () => {
		const result = extractFeatureSection(md, "Login & Auth");
		expect(result).toContain("AC-1.2 Logout");
		expect(result).not.toContain("Dashboard content.");
		expect(result).not.toContain("## Dashboard");
	});

	it("stops at end of string when it is the last feature", () => {
		const result = extractFeatureSection(md, "Dashboard");
		expect(result?.trim().endsWith("Dashboard content.")).toBe(true);
	});
});
