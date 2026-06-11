import type { Page } from "@playwright/test";

/** Faster, less flaky than default `load` on Turbopack dev server. */
export async function gotoApp(
  page: Page,
  path: string,
): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
}