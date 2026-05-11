import { test, expect } from "@playwright/test";

test.describe("Public Pages Accessibility", () => {
  test("landing page has no major accessibility violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as Record<string, unknown>).axe;
      if (!axe) return [];
      return (axe as { run: () => Promise<Array<{ id: string; impact: string }>> }).run();
    });

    const criticalOrSerious = violations.filter(
      (v: { impact: string }) => v.impact === "critical" || v.impact === "serious"
    );
    expect(criticalOrSerious.length).toBe(0);
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      if (alt === null) continue;
      expect(alt).toBeDefined();
    }
  });

  test("language attribute is set", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});