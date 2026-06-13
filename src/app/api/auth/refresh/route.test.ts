import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const refreshAuth = vi.fn();
const setAuthCookies = vi.fn();
const createExtendedAuthTokens = vi.fn((tokens) => ({
  ...tokens,
  accessToken: "extended-access-token",
}));

vi.mock("@insforge/sdk/ssr", () => ({
  refreshAuth,
  setAuthCookies,
}));

vi.mock("@/lib/insforge/auth-cookies", () => ({
  authCookieSettings: {
    options: {
      refreshToken: {
        maxAge: 60 * 60 * 24 * 30,
      },
    },
  },
}));

vi.mock("@/lib/insforge/session-token", () => ({
  createExtendedAuthTokens,
}));

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-key";
  });

  it("returns and stores the extended access token after refresh", async () => {
    refreshAuth.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: {
        accessToken: "short-access-token",
        csrfToken: "csrf-token",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      accessToken: "short-access-token",
      refreshToken: null,
      error: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: {
          cookie: "insforge_refresh_token=existing-refresh-token",
        },
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      accessToken: "extended-access-token",
      csrfToken: "csrf-token",
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    });
    expect(refreshAuth).toHaveBeenCalledWith({
      baseUrl: "https://example.insforge.app",
      anonKey: "anon-key",
      request: expect.any(NextRequest),
      cookies: expect.anything(),
      options: {
        refreshToken: {
          maxAge: 60 * 60 * 24 * 30,
        },
      },
    });
    expect(createExtendedAuthTokens).toHaveBeenCalledWith({
      accessToken: "short-access-token",
      refreshToken: "existing-refresh-token",
    }, {
      id: "user-1",
      email: "user@example.com",
    });
    expect(setAuthCookies).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "extended-access-token",
      refreshToken: "existing-refresh-token",
    }, {
      options: {
        refreshToken: {
          maxAge: 60 * 60 * 24 * 30,
        },
      },
    });
  });

  it("returns the SDK response when refresh fails", async () => {
    const sdkResponse = new Response(JSON.stringify({ error: "AUTH_UNAUTHORIZED" }), { status: 401 });

    refreshAuth.mockResolvedValue({
      response: sdkResponse,
      data: null,
      accessToken: null,
      refreshToken: null,
      error: new Error("Unauthorized"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", {
        method: "POST",
      }),
    );

    expect(response).toBe(sdkResponse);
    expect(createExtendedAuthTokens).not.toHaveBeenCalled();
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
