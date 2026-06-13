import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const createServerClient = vi.fn(() => ({
  auth: {
    signUp,
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

describe("POST /api/auth/sign-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-key";
  });

  it("sets SSR auth cookies when registration returns a session", async () => {
    signUp.mockResolvedValue({
      data: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        requireEmailVerification: false,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({
          email: " user@example.com ",
          password: "password123",
          redirectTo: "http://localhost/auth/callback",
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toMatchObject({
      requireEmailVerification: false,
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    });
    expect(createServerClient).toHaveBeenCalledWith({
      baseUrl: "https://example.insforge.app",
      anonKey: "anon-key",
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      redirectTo: "http://localhost/auth/callback",
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

  it("does not set auth cookies when email verification is required", async () => {
    signUp.mockResolvedValue({
      data: {
        requireEmailVerification: true,
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
