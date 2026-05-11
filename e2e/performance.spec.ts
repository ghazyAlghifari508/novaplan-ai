import { test, expect } from "@playwright/test";

test.describe("Performance", () => {
  test("landing page loads within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("pricing page loads within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("login page loads within 2 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors.filter((e) => !e.includes("websocket") && !e.includes("favicon"))).toHaveLength(0);
  });
});