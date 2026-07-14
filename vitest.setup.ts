import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ponytail: Vitest runs without a Next.js request scope, so `cookies()` from
// next/headers throws on call. Provide a no-op stub for tests that import server
// modules which touch cookies (e.g. createServerInsforge in sign-in/sign-up).
// Production requests always carry cookies — this mock only fills the test gap.
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
    }),
  headers: () => Promise.resolve(new Map()),
}));
