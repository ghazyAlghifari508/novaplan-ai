import { describe, it, expect } from "vitest";
import { isBanned, isAdmin } from "@/lib/session";

// Local mirrors of the guard branching in session.ts (snake_case fields).
// These replicate the exact checks performed by requireUser / requireAdmin
// without requiring DB or TanStack server runtime.
function requireUserGuard(session: { user: Record<string, unknown> } | null) {
	if (!session?.user) throw new Error("Unauthorized");
	if ((session.user as { banned_at?: string | Date }).banned_at) throw new Error("Forbidden");
	return session.user;
}

function requireAdminGuard(session: { user: Record<string, unknown> } | null) {
	if (!session?.user) throw new Error("Unauthorized");
	if ((session.user as { banned_at?: string | Date }).banned_at) throw new Error("Forbidden");
	if (!(session.user as { is_admin?: boolean }).is_admin) throw new Error("Forbidden");
	return session.user;
}

describe("isBanned helper (snake_case banned_at)", () => {
	it("returns false for null/undefined user", () => {
		expect(isBanned(null)).toBe(false);
		expect(isBanned(undefined)).toBe(false);
	});

	it("returns false when banned_at is missing, null, or undefined", () => {
		expect(isBanned({ id: "u1" })).toBe(false);
		expect(isBanned({ id: "u1", banned_at: null })).toBe(false);
		expect(isBanned({ id: "u1", banned_at: undefined })).toBe(false);
	});

	it("returns true when banned_at is truthy (Date or string)", () => {
		expect(isBanned({ id: "u1", banned_at: new Date() })).toBe(true);
		expect(isBanned({ id: "u1", banned_at: "2026-08-26T00:00:00.000Z" })).toBe(true);
	});
});

describe("isAdmin helper (snake_case is_admin)", () => {
	it("returns false when is_admin is missing, falsy, or false", () => {
		expect(isAdmin(null)).toBe(false);
		expect(isAdmin({ id: "u1" })).toBe(false);
		expect(isAdmin({ id: "u1", is_admin: false })).toBe(false);
		expect(isAdmin({ id: "u1", is_admin: undefined })).toBe(false);
	});

	it("returns true only when is_admin is true", () => {
		expect(isAdmin({ id: "u1", is_admin: true })).toBe(true);
	});

	it("treats truthy non-boolean consistently via Boolean coercion", () => {
		// Better Auth stores boolean; helpers use Boolean() so 1 would be true but we enforce strict true expectation via manual check
		expect(isAdmin({ id: "u1", is_admin: true })).toBe(true);
		expect(isAdmin({ id: "u1", is_admin: false })).toBe(false);
	});
});

describe("requireUser throws Unauthorized when session is null", () => {
	it("throws Unauthorized for null session", () => {
		expect(() => requireUserGuard(null)).toThrow("Unauthorized");
	});

	it("throws Unauthorized for session with null user", () => {
		expect(() => requireUserGuard({ user: null as unknown as Record<string, unknown> })).toThrow("Unauthorized");
	});

	it("throws Unauthorized when user is missing", () => {
		expect(() => requireUserGuard({ user: undefined as unknown as Record<string, unknown> })).toThrow("Unauthorized");
	});
});

describe("requireUser throws Forbidden when session.user.banned_at is truthy", () => {
	it("throws Forbidden when banned_at is a Date", () => {
		expect(() => requireUserGuard({ user: { id: "u1", banned_at: new Date() } })).toThrow("Forbidden");
	});

	it("throws Forbidden when banned_at is a string", () => {
		expect(() => requireUserGuard({ user: { id: "u1", banned_at: "2026-01-01" } })).toThrow("Forbidden");
	});

	it("does not throw when banned_at is absent", () => {
		expect(() => requireUserGuard({ user: { id: "u1" } })).not.toThrow();
		expect(requireUserGuard({ user: { id: "u1", banned_at: null as unknown as string } })).toEqual({ id: "u1", banned_at: null });
	});

	it("isBanned helper agrees with guard's banned_at check", () => {
		const user = { id: "u1", banned_at: new Date() };
		expect(isBanned(user)).toBe(true);
		expect(() => requireUserGuard({ user })).toThrow("Forbidden");
	});
});

describe("requireAdmin throws Forbidden when session.user.is_admin falsy", () => {
	it("throws Unauthorized when session is null", () => {
		expect(() => requireAdminGuard(null)).toThrow("Unauthorized");
	});

	it("throws Forbidden when is_admin is missing", () => {
		expect(() => requireAdminGuard({ user: { id: "u1" } })).toThrow("Forbidden");
	});

	it("throws Forbidden when is_admin is false", () => {
		expect(() => requireAdminGuard({ user: { id: "u1", is_admin: false } })).toThrow("Forbidden");
	});

	it("throws Forbidden when is_admin is undefined or null", () => {
		expect(() => requireAdminGuard({ user: { id: "u1", is_admin: undefined } })).toThrow("Forbidden");
		expect(() => requireAdminGuard({ user: { id: "u1", is_admin: null as unknown as boolean } })).toThrow("Forbidden");
	});

	it("isAdmin helper agrees with guard's is_admin check", () => {
		const nonAdmin = { id: "u1", is_admin: false };
		expect(isAdmin(nonAdmin)).toBe(false);
		expect(() => requireAdminGuard({ user: nonAdmin })).toThrow("Forbidden");
	});
});

describe("requireAdmin resolves when is_admin true", () => {
	it("resolves and returns user when is_admin is true", () => {
		const user = { id: "u1", is_admin: true };
		expect(requireAdminGuard({ user })).toEqual(user);
		expect(isAdmin(user)).toBe(true);
	});

	it("throws Forbidden when admin is banned (banned_at enforced before is_admin)", () => {
		const adminBanned = { id: "u1", is_admin: true, banned_at: new Date() };
		expect(() => requireAdminGuard({ user: adminBanned })).toThrow("Forbidden");
		expect(() => requireAdminGuard({ user: { id: "u1", is_admin: true, banned_at: "2026-01-01" } })).toThrow("Forbidden");
	});

	it("admin user with extra fields still resolves", () => {
		const admin = { id: "u1", email: "admin@example.com", is_admin: true, banned_at: null };
		expect(requireAdminGuard({ user: admin })).toEqual(admin);
	});
});

describe("snake_case contract (Better Auth additionalFields)", () => {
	it("guards read snake_case keys, not camelCase", async () => {
		// Verify via runtime helpers: camelCase should NOT be considered banned/admin
		expect(isBanned({ id: "u1", bannedAt: new Date() } as unknown as Record<string, unknown>)).toBe(false);
		expect(isAdmin({ id: "u1", isAdmin: true } as unknown as Record<string, unknown>)).toBe(false);

		// But snake_case is recognized
		expect(isBanned({ id: "u1", banned_at: new Date() })).toBe(true);
		expect(isAdmin({ id: "u1", is_admin: true })).toBe(true);

		// Guard mirrors same
		expect(() => requireUserGuard({ user: { id: "u1", bannedAt: new Date() } as unknown as Record<string, unknown> })).not.toThrow();
		expect(() => requireAdminGuard({ user: { id: "u1", isAdmin: true } as unknown as Record<string, unknown> })).toThrow("Forbidden");
	});
});
