import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers/navigation";
import { guestHubZone, roomWelcomeHeading } from "./helpers/locators";

test.describe("Room context (M4)", () => {
  test("caribe-room-412 shows room banner and room service", async ({
    page,
  }) => {
    await gotoApp(page, "/t/caribe-room-412");

    await expect(roomWelcomeHeading(page, "412")).toBeVisible();

    await expect(
      page.getByText("Su estancia", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Suite muralla/i)).toBeVisible();
    await expect(page.getByText(/Servicio a la habitación/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Su habitación" }),
    ).toBeVisible();
  });

  test("caribe-lobby does not show room banner", async ({ page }) => {
    await gotoApp(page, "/t/caribe-lobby");

    await expect(
      page.getByRole("heading", { name: /Bienvenido a la habitación/i }),
    ).toHaveCount(0);
    await expect(guestHubZone(page)).toHaveText("Lobby");
  });

  test("all pilot room tags resolve room context", async ({ page }) => {
    const roomTags = [
      { slug: "caribe-room-205", room: "205" },
      { slug: "caribe-room-312", room: "312" },
      { slug: "caribe-room-412", room: "412" },
      { slug: "caribe-room-508", room: "508" },
      { slug: "caribe-room-601", room: "601" },
    ];

    for (const { slug, room } of roomTags) {
      await gotoApp(page, `/t/${slug}`);
      await expect(roomWelcomeHeading(page, room)).toBeVisible();
    }
  });
});