import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectModels, tryStreamWithFallback } from "./ai-orchestrator";

const { streamChatMock } = vi.hoisted(() => ({
	streamChatMock: vi.fn(),
}));

vi.mock("@/lib/ai-client", () => ({
	streamChat: streamChatMock,
}));

describe("selectModels", () => {
	it("returns array with single combo ID", () => {
		const models = selectModels();
		expect(models).toEqual(["novaplan-combo"]);
	});

	it("accepts no parameters", () => {
		// @ts-expect-error — should have zero params
		expect(() => selectModels("free")).not.toThrow();
	});
});

function hangingGen(signal: AbortSignal) {
	return {
		next: () =>
			new Promise((_resolve, reject) => {
				const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
				if (signal.aborted) onAbort();
				else signal.addEventListener("abort", onAbort, { once: true });
			}),
		return: async () => ({ value: undefined, done: true }),
		[Symbol.asyncIterator]() {
			return this;
		},
	};
}

describe("tryStreamWithFallback abort fast-path", () => {
	beforeEach(() => {
		streamChatMock.mockReset();
	});

	it("throws immediately when external signal is already aborted (zero attempts)", async () => {
		const ctrl = new AbortController();
		ctrl.abort();

		const start = Date.now();
		await expect(
			tryStreamWithFallback(["novaplan-combo"], [], ctrl.signal),
		).rejects.toThrow(/aborted/i);
		expect(Date.now() - start).toBeLessThan(250);
		expect(streamChatMock).not.toHaveBeenCalled();
	});

	it("does not burn retry attempts after mid-flight abort", async () => {
		vi.useFakeTimers();
		const ctrl = new AbortController();
		streamChatMock.mockImplementation(
			(_m: unknown, _model: unknown, signal: AbortSignal) => hangingGen(signal),
		);

		const promise = tryStreamWithFallback(["novaplan-combo"], [], ctrl.signal);
		ctrl.abort(); // abort while first attempt is pending
		vi.advanceTimersByTimeAsync; // ensure microtasks flush below

		const expectation = expect(promise).rejects.toThrow(/aborted/i);
		await vi.runAllTimersAsync();
		await expectation;

		expect(streamChatMock).toHaveBeenCalledTimes(1); // no retry attempt #2
		vi.useRealTimers();
	});
});
