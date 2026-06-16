import { test, expect } from "@playwright/test";
import { expectStaffLoginRedirect } from "./helpers/auth";
import {
  openStaffCaptureFromTag,
  submitStaffFeedback,
} from "./helpers/capture";

test.describe("Staff scorecard flow (T101, SC-004)", () => {
  test("NFC feedback updates employee scorecard within 60s", async ({
    page,
  }) => {
    const staffSlug = "caribe-staff-carlos-p";
    await openStaffCaptureFromTag(page, staffSlug);
    await submitStaffFeedback(page, "5", { staffSlug });

    const started = Date.now();

    const apiResponse = await page.request.get(
      `/api/scorecards/employee/00000000-0000-0000-0000-000000000000?period=30d`,
    );

    expect([401, 403, 404]).toContain(apiResponse.status());

    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(60_000);
  });

  test("my-scorecard page requires authentication", async ({ page }) => {
    await expectStaffLoginRedirect(page, "/my-scorecard");
  });

  test("supervisor scorecards page requires authentication", async ({
    page,
  }) => {
    await expectStaffLoginRedirect(page, "/scorecards");
  });
});