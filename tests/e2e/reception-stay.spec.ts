import { expect, test } from "@playwright/test";

/**
 * E2E smoke for M2 reception flow (T063).
 * Requires pilot seed + STAFF_SEED_RECEPTION_EMAIL credentials in env.
 */
test.describe("reception stay flow (M2)", () => {
  test.skip(
    !process.env.STAFF_SEED_RECEPTION_EMAIL ||
      !process.env.STAFF_SEED_RECEPTION_PASSWORD,
    "Reception pilot credentials not configured",
  );

  test("reception page loads for authenticated reception user", async ({
    page,
  }) => {
    await page.goto("/login?next=/reception");

    await page.getByLabel(/correo|email/i).fill(
      process.env.STAFF_SEED_RECEPTION_EMAIL!,
    );
    await page.getByLabel(/contraseña|password/i).fill(
      process.env.STAFF_SEED_RECEPTION_PASSWORD!,
    );
    await page.getByRole("button", { name: /iniciar sesión|entrar/i }).click();

    await expect(page).toHaveURL(/\/reception/);
    await expect(
      page.getByRole("heading", { name: /estadía del huésped/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /generar estadía/i }),
    ).toBeVisible();
  });
});