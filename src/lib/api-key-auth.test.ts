import { describe, it, expect } from "vitest";
import { hasScope } from "./api-key-auth";
import type { ApiKeyAuthResult } from "./api-key-auth";

function mockAuth(scopes: string[]): ApiKeyAuthResult {
  return { userId: "user-1", scopes, keyId: "key-1" };
}

describe("api-key-auth", () => {
  describe("hasScope", () => {
    it("returns true when exact scope matches", () => {
      const auth = mockAuth(["read:project", "write:task:status"]);
      expect(hasScope(auth, "read:project")).toBe(true);
      expect(hasScope(auth, "write:task:status")).toBe(true);
    });

    it("returns false when scope not found", () => {
      const auth = mockAuth(["read:project"]);
      expect(hasScope(auth, "write:task:status")).toBe(false);
    });

    it("returns true when admin scope present", () => {
      const auth = mockAuth(["admin"]);
      expect(hasScope(auth, "read:project")).toBe(true);
      expect(hasScope(auth, "write:task:status")).toBe(true);
    });

    it("returns true when wildcard scope present", () => {
      const auth = mockAuth(["*"]);
      expect(hasScope(auth, "read:project")).toBe(true);
      expect(hasScope(auth, "anything")).toBe(true);
    });

    it("returns false for empty scopes", () => {
      const auth = mockAuth([]);
      expect(hasScope(auth, "read:project")).toBe(false);
    });
  });
});
