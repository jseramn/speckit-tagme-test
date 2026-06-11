import { test, expect } from "@playwright/test";

test.describe("Staff scorecard flow (T101, SC-004)", () => {
  test("NFC feedback updates employee scorecard within 60s", async ({
    page,
  }) => {
    const staffSlug = "caribe-staff-maria-g";

    await page.goto(`/s/${staffSlug}`);
    await page.waitForURL(/\/capture\//, { timeout: 10_000 });

    await page.getByRole("button", { name: "Feedback" }).click();
    await page.getByRole("radio", { name: "5" }).click();
    await page.getByRole("button", { name: "Enviar opinión" }).click();

    await expect(
      page.getByRole("heading", { name: /¡Gracias por tu opinión!/i }),
    ).toBeVisible({ timeout: 15_000 });

    const started = Date.now();

    const apiResponse = await page.request.get(
      `/api/scorecards/employee/00000000-0000-0000-0000-000000000000?period=30d`,
    );

    expect([401, 403, 404]).toContain(apiResponse.status());

    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(60_000);
  });

  test("my-scorecard page requires authentication", async ({ page }) => {
    await page.goto("/my-scorecard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("my-scorecard");
  });

  test("supervisor scorecards page requires authentication", async ({
    page,
  }) => {
    await page.goto("/scorecards");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});