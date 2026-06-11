import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers/navigation";
import { guestHubZone, roomWelcomeHeading } from "./helpers/locators";

test.describe("NFC guest hub flow", () => {
  test("caribe-lobby loads hub with destinations", async ({ page }) => {
    await gotoApp(page, "/t/caribe-lobby");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Hotel Caribe/i,
    );
    await expect(guestHubZone(page)).toHaveText("Lobby");
    await expect(page.getByText(/Menú Digital/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Explorar" }),
    ).toBeVisible();
  });

  test("invalid tag shows fallback help", async ({ page }) => {
    await gotoApp(page, "/t/tag-invalido-xyz");

    await expect(
      page.getByRole("heading", { name: /Punto NFC no encontrado/i }),
    ).toBeVisible();
    await expect(page.getByText(/Acerca tu teléfono/i)).toBeVisible();
  });

  test("caribe-room-412 resolves room context", async ({ page }) => {
    await gotoApp(page, "/t/caribe-room-412");

    await expect(roomWelcomeHeading(page, "412")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});