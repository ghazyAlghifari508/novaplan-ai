import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api-client.js", () => ({
	apiGet: vi.fn(),
	apiPost: vi.fn(),
}));

import { apiGet } from "../lib/api-client.js";
import { taskNextCommand } from "./task.js";

const baseTask = {
	id: "task-1",
	name: "Do the thing",
	description: null,
	status: "pending",
	featureName: "Feature A",
	startedAt: null,
	completedAt: null,
	subtasks: [],
};

function loggedText(logSpy: ReturnType<typeof vi.spyOn>) {
	return logSpy.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
}

describe("taskNextCommand", () => {
	beforeEach(() => {
		vi.mocked(apiGet).mockReset();
	});

	it("prints Acceptance Criteria block when acContext is present", async () => {
		vi.mocked(apiGet).mockResolvedValue({
			tasks: [{ ...baseTask, acContext: "User must be able to log in." }],
		});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await taskNextCommand("proj-1");

		const output = loggedText(logSpy);
		expect(output).toContain("Acceptance Criteria:");
		expect(output).toContain("User must be able to log in.");
		logSpy.mockRestore();
	});

	it("prints multi-line acContext as separate indented lines", async () => {
		vi.mocked(apiGet).mockResolvedValue({
			tasks: [{ ...baseTask, acContext: "Line 1\nLine 2\nLine 3" }],
		});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await taskNextCommand("proj-1");

		const output = loggedText(logSpy);
		expect(output).toContain("Acceptance Criteria:");
		expect(output).toContain("  Line 1");
		expect(output).toContain("  Line 2");
		expect(output).toContain("  Line 3");
		logSpy.mockRestore();
	});

	it("prints nothing extra when acContext is null", async () => {
		vi.mocked(apiGet).mockResolvedValue({
			tasks: [{ ...baseTask, acContext: null }],
		});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await taskNextCommand("proj-1");

		expect(loggedText(logSpy)).not.toContain("Acceptance Criteria:");
		logSpy.mockRestore();
	});

	it("prints nothing extra when acContext is empty/whitespace", async () => {
		vi.mocked(apiGet).mockResolvedValue({
			tasks: [{ ...baseTask, acContext: "   " }],
		});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await taskNextCommand("proj-1");

		expect(loggedText(logSpy)).not.toContain("Acceptance Criteria:");
		logSpy.mockRestore();
	});
});
