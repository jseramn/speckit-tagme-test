import { test, expect } from "@playwright/test";

test("home page shows TagMe foundation status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Plataforma NFC/i })).toBeVisible();
  await expect(page.getByText(/Fundación M0/i)).toBeVisible();
});