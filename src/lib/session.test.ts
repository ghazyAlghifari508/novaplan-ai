import { describe, it, expect } from "vitest";
import { isBanned, isAdmin } from "@/lib/session";

function requireUserGuard(session: { user: Record<string, unknown> } | null) {
	if (!session?.user) throw new Error("Unauthorized");
	if (isBanned(session.user)) throw new Error("Forbidden");
	return session.user;
}

function requireAdminGuard(session: { user: Record<string, unknown> } | null) {
	if (!session?.user) throw new Error("Unauthorized");
	if (isBanned(session.user)) throw new Error("Forbidden");
	if (!isAdmin(session.user)) throw new Error("Forbidden");
	return session.user;
}

describe("isBanned helper", () => {
	it("returns false for null/undefined user", () => {
		expect(isBanned(null)).toBe(false);
		expect(isBanned(undefined)).toBe(false);
	});

	it("returns false when banned is missing, null, or undefined", () => {
		expect(isBanned({ id: "u1" })).toBe(false);
		expect(isBanned({ id: "u1", bannedAt: null })).toBe(false);
		expect(isBanned({ id: "u1", banned_at: null })).toBe(false);
	});

	it("returns true when bannedAt or banned_at is truthy", () => {
		expect(isBanned({ id: "u1", bannedAt: new Date() })).toBe(true);
		expect(isBanned({ id: "u1", banned_at: new Date() })).toBe(true);
		expect(isBanned({ id: "u1", bannedAt: "2026-08-26T00:00:00.000Z" })).toBe(true);
	});
});

describe("isAdmin helper", () => {
	it("returns false when isAdmin/is_admin is missing, falsy, or false", () => {
		expect(isAdmin(null)).toBe(false);
		expect(isAdmin({ id: "u1" })).toBe(false);
		expect(isAdmin({ id: "u1", isAdmin: false })).toBe(false);
		expect(isAdmin({ id: "u1", is_admin: false })).toBe(false);
	});

	it("returns true when isAdmin or is_admin is true", () => {
		expect(isAdmin({ id: "u1", isAdmin: true })).toBe(true);
		expect(isAdmin({ id: "u1", is_admin: true })).toBe(true);
	});
});

describe("requireUser guard", () => {
	it("throws Unauthorized when session is null", () => {
		expect(() => requireUserGuard(null)).toThrow("Unauthorized");
	});

	it("throws Forbidden when user is banned", () => {
		expect(() => requireUserGuard({ user: { id: "u1", bannedAt: new Date() } })).toThrow("Forbidden");
		expect(() => requireUserGuard({ user: { id: "u1", banned_at: new Date() } })).toThrow("Forbidden");
	});

	it("returns user when valid and not banned", () => {
		const user = { id: "u1", email: "test@example.com" };
		expect(requireUserGuard({ user })).toEqual(user);
	});
});

describe("requireAdmin guard", () => {
	it("throws Unauthorized when session is null", () => {
		expect(() => requireAdminGuard(null)).toThrow("Unauthorized");
	});

	it("throws Forbidden when user is not admin", () => {
		expect(() => requireAdminGuard({ user: { id: "u1" } })).toThrow("Forbidden");
		expect(() => requireAdminGuard({ user: { id: "u1", isAdmin: false } })).toThrow("Forbidden");
	});

	it("throws Forbidden when admin is banned", () => {
		expect(() => requireAdminGuard({ user: { id: "u1", isAdmin: true, bannedAt: new Date() } })).toThrow("Forbidden");
	});

	it("returns user when user is admin", () => {
		const adminUser = { id: "u1", email: "admin@example.com", isAdmin: true };
		expect(requireAdminGuard({ user: adminUser })).toEqual(adminUser);
	});
});
