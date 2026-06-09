import { test, expect } from "@playwright/test";

test.describe("NFC guest hub flow", () => {
  test("caribe-lobby loads hub with destinations", async ({ page }) => {
    await page.goto("/t/caribe-lobby");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Hotel Caribe/i,
    );
    await expect(page.getByText(/Lobby/i)).toBeVisible();
    await expect(page.getByText(/Menú Digital/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Explorar" }),
    ).toBeVisible();
  });

  test("invalid tag shows fallback help", async ({ page }) => {
    await page.goto("/t/tag-invalido-xyz");

    await expect(
      page.getByRole("heading", { name: /Punto NFC no encontrado/i }),
    ).toBeVisible();
    await expect(page.getByText(/Acerca tu teléfono/i)).toBeVisible();
  });

  test("caribe-room-412 resolves room context", async ({ page }) => {
    await page.goto("/t/caribe-room-412");

    await expect(page.getByText(/Habitación 412/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});