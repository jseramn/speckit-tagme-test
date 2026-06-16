import { expect, type Page } from "@playwright/test";
import { gotoApp } from "./navigation";

export async function openStaffCaptureFromTag(
  page: Page,
  staffSlug: string,
): Promise<void> {
  await gotoApp(page, `/s/${staffSlug}`);
  await page.waitForURL(/\/capture\//, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Feedback" })).toBeVisible({
    timeout: 15_000,
  });
}

async function postFeedback(page: Page, rating: string): Promise<void> {
  await page.getByRole("button", { name: "Feedback" }).click();
  await expect(
    page.getByText("¿Cómo calificarías la atención?"),
  ).toBeVisible();

  await page.getByRole("radio", { name: rating }).click();

  const feedbackResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/capture/feedback") &&
      response.request().method() === "POST",
    { timeout: 20_000 },
  );

  await page.getByRole("button", { name: "Enviar opinión" }).click();
  const response = await feedbackResponse;

  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Feedback API failed: ${response.status()} ${response.statusText()} ${body}`,
    );
  }

  await expect(
    page.getByRole("heading", { name: /¡Gracias por tu opinión!/i }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function submitStaffFeedback(
  page: Page,
  rating = "5",
  options?: { staffSlug?: string },
): Promise<void> {
  await expect(page.getByRole("button", { name: "Feedback" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Incidencia" })).toBeVisible();

  try {
    await postFeedback(page, rating);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const canRetry =
      message.includes("SESSION_EXPIRED") && options?.staffSlug?.trim();

    if (!canRetry) throw error;

    await openStaffCaptureFromTag(page, options!.staffSlug!);
    await postFeedback(page, rating);
  }
}