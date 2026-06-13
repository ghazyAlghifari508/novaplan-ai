import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn(() => ({ auth: {} }));

vi.mock("@insforge/sdk/ssr", () => ({
  createBrowserClient,
}));

vi.mock("@/lib/insforge/auth-cookies", () => ({
  AUTH_REFRESH_LEEWAY_SECONDS: 120,
  authCookieSettings: {
    options: {
      refreshToken: {
        maxAge: 60 * 60 * 24 * 30,
      },
    },
  },
}));

describe("insforge browser client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-key";
  });

  it("uses the shared SSR cookie settings and proactive refresh leeway", async () => {
    await import("./client");

    expect(createBrowserClient).toHaveBeenCalledWith({
      baseUrl: "https://example.insforge.app",
      anonKey: "anon-key",
      refreshLeewaySeconds: 120,
      options: {
        refreshToken: {
          maxAge: 60 * 60 * 24 * 30,
        },
      },
    });
  });
});
