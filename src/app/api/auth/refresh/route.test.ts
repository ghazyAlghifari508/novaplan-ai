import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const refreshAuth = vi.fn();

vi.mock("@insforge/sdk/ssr", () => ({
  refreshAuth,
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

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-key";
  });

  it("returns the SDK response so the backend stays the session authority", async () => {
    const sdkResponse = new Response(null, { status: 200 });

    refreshAuth.mockResolvedValue({
      response: sdkResponse,
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

    expect(response).toBe(sdkResponse);
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
  });
});
