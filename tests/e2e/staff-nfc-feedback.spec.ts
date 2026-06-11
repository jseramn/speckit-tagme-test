import { test, expect } from "@playwright/test";

test.describe("Staff NFC → feedback flow (T049)", () => {
  test("opens capture from staff tag and submits feedback", async ({
    page,
  }) => {
    const started = Date.now();
    await page.goto("/s/caribe-staff-maria-g");

    await page.waitForURL(/\/capture\//, { timeout: 10_000 });
    const openMs = Date.now() - started;
    expect(openMs).toBeLessThan(10_000);

    await expect(page.getByText(/María G\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Feedback" })).toBeVisible();
    await expect(page.getByText("Próximamente")).toBeVisible();

    await page.getByRole("button", { name: "Feedback" }).click();
    await expect(
      page.getByText("¿Cómo calificarías la atención?"),
    ).toBeVisible();

    await page.getByRole("radio", { name: "5" }).click();
    await page.getByRole("button", { name: "Enviar opinión" }).click();

    await expect(
      page.getByRole("heading", { name: /¡Gracias por tu opinión!/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("invalid staff tag shows not found", async ({ page }) => {
    const response = await page.goto("/s/caribe-staff-invalido-xyz");
    expect(response?.status()).toBe(404);
  });
});