import { describe, expect, it } from "vitest";
import { deriveProjectNameSync } from "./prd-service";

describe("deriveProjectNameSync", () => {
	it("prefers a quoted product name", () => {
		expect(
			deriveProjectNameSync('Buatkan aplikasi kasir bernama "Warung Pintar"'),
		).toBe("Warung Pintar");
	});

	it("extracts bernama-X pattern without quotes", () => {
		expect(
			deriveProjectNameSync("tolong buatkan habit tracker bernama HabitFlow"),
		).toBe("HabitFlow");
	});

	it("extracts a CamelCase brand token", () => {
		expect(
			deriveProjectNameSync(
				"Buatkan SaaS habit tracker bernama HabitFlow — web app pakai React (Vite)",
			),
		).toBe("HabitFlow");
	});

	it("falls back to last meaningful words when no pattern", () => {
		expect(
			deriveProjectNameSync(
				"platform manajemen proyek untuk tim remote dengan time tracking",
			),
		).toBe("Tim Remote Time Tracking");
	});

	it("returns default for degenerate input", () => {
		expect(deriveProjectNameSync("buat app")).toBe("Project Baru");
	});
});
