import { test, expect } from "@playwright/test";

test.describe("Room capture (M4)", () => {
  test("caribe-room-412 capture page shows room context and choices", async ({
    page,
  }) => {
    await page.goto("/capture/room/caribe-room-412");

    await expect(
      page.getByRole("heading", { name: /Habitación 412/i }).first(),
    ).toBeVisible();

    await expect(page.getByText("Feedback", { exact: true })).toBeVisible();
    await expect(page.getByText("Incidencia", { exact: true })).toBeVisible();
  });

  test("hub shows capture CTAs linking to room capture", async ({ page }) => {
    await page.goto("/t/caribe-room-412");

    const opinionLink = page.getByRole("link", { name: /Dejar opinión/i });
    await expect(opinionLink).toBeVisible();
    await expect(opinionLink).toHaveAttribute(
      "href",
      "/capture/room/caribe-room-412",
    );

    const incidentLink = page.getByRole("link", {
      name: /Reportar problema/i,
    });
    await expect(incidentLink).toBeVisible();
    await expect(incidentLink).toHaveAttribute(
      "href",
      "/capture/room/caribe-room-412",
    );
  });

  test("TR-05: staff slugs /s/ do not collide with room hub /t/", async ({
    page,
  }) => {
    const staffResponse = await page.goto("/s/caribe-staff-maria-g");
    expect(staffResponse?.url()).toMatch(/\/capture\//);
    expect(staffResponse?.url()).not.toMatch(/\/capture\/room\//);

    const roomResponse = await page.goto("/t/caribe-room-412");
    expect(roomResponse?.url()).toMatch(/\/t\/caribe-room-412/);
  });
});