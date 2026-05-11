import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads landing page successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
  });

  test("has pricing link in navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pricing", { exact: true })).toBeVisible();
  });

  test("shows login and register links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /register/i })).toBeVisible();
  });
});