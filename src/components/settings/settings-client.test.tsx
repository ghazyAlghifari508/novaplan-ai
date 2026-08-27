// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsClient } from "./settings-client";

let mockLocation = { pathname: "/settings/profile" };
const mockBack = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		children,
		className,
	}: {
		to: string;
		children: React.ReactNode;
		className?: string;
	}) => {
		return (
			<a href={to} className={className}>
				{children}
			</a>
		);
	},
	useLocation: ({
		select,
	}: {
		select?: (l: { pathname: string }) => unknown;
	} = {}) => {
		return select ? select(mockLocation) : mockLocation;
	},
	useRouter: () => ({
		history: {
			back: mockBack,
		},
		navigate: mockNavigate,
	}),
}));

describe("SettingsClient Dynamic Back Navigation", () => {
	let container: HTMLDivElement;
	let root: Root | null = null;

	beforeEach(() => {
		mockLocation = { pathname: "/settings/profile" };
		mockBack.mockClear();
		mockNavigate.mockClear();
		(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		if (root) {
			act(() => {
				root?.unmount();
			});
			root = null;
		}
		container?.remove();
	});

	it("renders Kembali button on desktop and mobile", () => {
		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		expect(container.textContent).toContain("Kembali");
		// Verify no 'Kembali ke Admin Panel' or 'Back to Workspace' exists
		expect(container.textContent).not.toContain("Kembali ke Admin Panel");
		expect(container.textContent).not.toContain("Back to Workspace");
	});

	it("calls history.back() when window.history.length > 1", () => {
		Object.defineProperty(window.history, "length", {
			value: 2,
			configurable: true,
		});

		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		const backBtn = container.querySelector("button[title='Kembali']");
		expect(backBtn).not.toBeNull();

		act(() => {
			(backBtn as HTMLButtonElement).click();
		});

		expect(mockBack).toHaveBeenCalled();
	});

	it("falls back to navigate('/') when window.history.length <= 1", () => {
		Object.defineProperty(window.history, "length", {
			value: 1,
			configurable: true,
		});

		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		const backBtn = container.querySelector("button[title='Kembali']");
		expect(backBtn).not.toBeNull();

		act(() => {
			(backBtn as HTMLButtonElement).click();
		});

		expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("renders clean navigation tabs without query parameter artifacts", () => {
		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		const billingLink = container.querySelector('a[href="/settings/billing"]');
		expect(billingLink).not.toBeNull();
		const allLinks = Array.from(container.querySelectorAll("a"));
		for (const link of allLinks) {
			expect(link.getAttribute("href")).not.toContain("?from=");
		}
	});
});
