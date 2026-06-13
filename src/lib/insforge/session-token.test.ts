import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExtendedAuthTokens, EXTENDED_SESSION_SECONDS } from "./session-token";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");

  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
}

function makeJwt(payload: Record<string, unknown>) {
  return [
    base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    base64UrlEncode(JSON.stringify(payload)),
    "signature",
  ].join(".");
}

describe("createExtendedAuthTokens", () => {
  const originalSecret = process.env.INSFORGE_JWT_SECRET;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T00:00:00.000Z"));
    process.env.INSFORGE_JWT_SECRET = "test-jwt-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.INSFORGE_JWT_SECRET = originalSecret;
  });

  it("signs an access token that stays valid for three hours", () => {
    const tokens = createExtendedAuthTokens({
      accessToken: makeJwt({
        aud: "authenticated",
        role: "authenticated",
        sub: "old-user",
        exp: 60,
      }),
      refreshToken: "refresh-token",
    }, {
      id: "user-1",
      email: "user@example.com",
    });

    const payload = decodeJwtPayload(tokens.accessToken);

    expect(tokens.refreshToken).toBe("refresh-token");
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
    expect(payload.role).toBe("authenticated");
    expect(Number(payload.exp) - Number(payload.iat)).toBe(EXTENDED_SESSION_SECONDS);
    expect(EXTENDED_SESSION_SECONDS).toBe(60 * 60 * 3);
  });

  it("keeps the original tokens when the signing secret is missing", () => {
    delete process.env.INSFORGE_JWT_SECRET;

    const originalTokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    };

    expect(createExtendedAuthTokens(originalTokens, { id: "user-1" })).toBe(originalTokens);
  });
});
