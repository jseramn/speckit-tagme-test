import { test, expect } from "@playwright/test";
import {
  openStaffCaptureFromTag,
  submitStaffFeedback,
} from "./helpers/capture";

test.describe("Staff NFC → feedback flow (T049)", () => {
  test("opens capture from staff tag and submits feedback", async ({
    page,
  }) => {
    const started = Date.now();
    await openStaffCaptureFromTag(page, "caribe-staff-maria-g");
    const openMs = Date.now() - started;
    expect(openMs).toBeLessThan(15_000);

    await expect(page.getByText(/María G\./i)).toBeVisible();
    await submitStaffFeedback(page, "5", {
      staffSlug: "caribe-staff-maria-g",
    });
  });

  test("invalid staff tag shows not found", async ({ page }) => {
    const response = await page.goto("/s/caribe-staff-invalido-xyz", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);
  });
});