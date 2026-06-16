import { expect, type Page } from "@playwright/test";
import { gotoApp } from "./navigation";

/**
 * Staff pages use server redirect to /login?next=… when unauthenticated.
 * Playwright webServer disables STAFF_DEV_TOKEN so dev auto-session does not apply.
 */
export async function expectStaffLoginRedirect(
  page: Page,
  protectedPath: string,
): Promise<void> {
  await gotoApp(page, protectedPath);

  await page.waitForURL(
    (url) => {
      const parsed = new URL(url);
      return (
        parsed.pathname === "/login" &&
        parsed.searchParams.get("next") === protectedPath
      );
    },
    { timeout: 15_000 },
  );

  await expect(
    page.getByRole("heading", { name: /acceso staff/i }),
  ).toBeVisible();
}