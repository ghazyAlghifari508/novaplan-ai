import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const createServerClient = vi.fn(() => ({
  auth: {
    signInWithPassword,
  },
}));
const setAuthCookies = vi.fn();

vi.mock("@insforge/sdk/ssr", () => ({
  createServerClient,
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

describe("POST /api/auth/sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-key";
  });

  it("sets SSR auth cookies when password sign-in succeeds", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: " user@example.com ",
          password: "password123",
          redirectTo: "/prd",
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toMatchObject({
      redirectTo: "/prd",
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    });
    expect(createServerClient).toHaveBeenCalledWith({
      baseUrl: "https://example.insforge.app",
      anonKey: "anon-key",
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
    expect(setAuthCookies).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }, {
      options: {
        refreshToken: {
          maxAge: 60 * 60 * 24 * 30,
        },
      },
    });
  });

  it("rejects successful auth responses that do not include a refresh token", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        accessToken: "access-token",
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
          redirectTo: "/prd",
        }),
      }) as never,
    );

    expect(response.status).toBe(401);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
