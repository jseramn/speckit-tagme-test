import { test, expect } from "@playwright/test";

/**
 * M6 smoke (T089): executive overview loads with pulse panel visible.
 * Requires dev bypass: STAFF_DEV_TOKEN + STAFF_DEV_EXECUTIVE_ROLE=executive
 * when running against `npm run dev` (see quickstart.md).
 */
test.describe("Executive overview smoke", () => {
  test("overview page loads with pulse visible", async ({ page }) => {
    await page.goto("/executive/overview");

    await expect(
      page.getByRole("heading", { name: /Panorama|Hotel|Gerente/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/Pulso|Pulso en tiempo real|Actividad/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});