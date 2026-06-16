import type { Page } from "@playwright/test";

export function guestHubZone(page: Page) {
  return page.getByTestId("guest-hub-zone");
}

export function roomWelcomeHeading(page: Page, roomNumber: string) {
  return page.getByRole("heading", {
    name: new RegExp(`Bienvenido a la habitación ${roomNumber}`, "i"),
  });
}

export function roomLabel(page: Page, roomNumber: string) {
  return page.getByTestId("guest-room-label").filter({
    hasText: new RegExp(`Habitación ${roomNumber}`, "i"),
  });
}