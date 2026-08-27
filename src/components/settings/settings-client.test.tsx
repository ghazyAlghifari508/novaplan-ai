// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsClient } from "./settings-client";

let mockLocation = { pathname: "/settings/profile", searchStr: "" };

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		search,
		children,
		className,
	}: {
		to: string;
		search?: Record<string, unknown>;
		children: React.ReactNode;
		className?: string;
	}) => {
		const searchString = search
			? `?${new URLSearchParams(search as Record<string, string>).toString()}`
			: "";
		return (
			<a href={`${to}${searchString}`} className={className}>
				{children}
			</a>
		);
	},
	useLocation: ({
		select,
	}: {
		select?: (l: { pathname: string; searchStr: string }) => unknown;
	} = {}) => {
		return select ? select(mockLocation) : mockLocation;
	},
}));

describe("SettingsClient Back Navigation", () => {
	let container: HTMLDivElement;
	let root: Root | null = null;

	beforeEach(() => {
		mockLocation = { pathname: "/settings/profile", searchStr: "" };
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

	it("renders default Back to Workspace when from parameter is absent", () => {
		mockLocation = { pathname: "/settings/profile", searchStr: "" };

		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		expect(container.textContent).toContain("Back to Workspace");
		const backLink = container.querySelector('a[href="/"]');
		expect(backLink).not.toBeNull();
	});

	it("renders Kembali ke Admin Panel when ?from=admin is present", () => {
		mockLocation = { pathname: "/settings/profile", searchStr: "?from=admin" };

		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		expect(container.textContent).toContain("Kembali ke Admin Panel");
		const adminLink = container.querySelector('a[href="/admin"]');
		expect(adminLink).not.toBeNull();
	});

	it("preserves ?from=admin in settings navigation tabs", () => {
		mockLocation = { pathname: "/settings/profile", searchStr: "?from=admin" };

		act(() => {
			root?.render(
				<SettingsClient profile={{}}>
					<div>Profile Content</div>
				</SettingsClient>,
			);
		});

		const billingLink = container.querySelector(
			'a[href="/settings/billing?from=admin"]',
		);
		expect(billingLink).not.toBeNull();
	});
});
