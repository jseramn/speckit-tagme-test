import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadEnvFile(filename: string): void {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) return;

  const content = readFileSync(filepath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const hasInsforge =
  !!process.env.INSFORGE_URL && !!process.env.INSFORGE_SERVICE_KEY;

describe.skipIf(!hasInsforge)("resolveTag integration", () => {
  // Dynamic import after env is loaded
  let resolveTag: typeof import("@/lib/tags/resolve-tag").resolveTag;

  it("loads resolveTag module", async () => {
    ({ resolveTag } = await import("@/lib/tags/resolve-tag"));
    expect(resolveTag).toBeTypeOf("function");
  });
  it("resolves caribe-lobby from seed with venue and experience", async () => {
    if (!resolveTag) {
      ({ resolveTag } = await import("@/lib/tags/resolve-tag"));
    }
    const payload = await resolveTag("caribe-lobby");

    expect(payload).not.toBeNull();
    expect(payload?.tag.slug).toBe("caribe-lobby");
    expect(payload?.tag.zone).toBe("lobby");
    expect(payload?.venue.slug).toBe("hotel-caribe");
    expect(payload?.venue.name).toContain("Hotel Caribe");
    expect(payload?.experience.destinations.length).toBeGreaterThan(0);
    expect(payload?.experience.avexEnabled).toBe(true);
  });

  it("resolves room tag with roomNumber and roomContext", async () => {
    if (!resolveTag) {
      ({ resolveTag } = await import("@/lib/tags/resolve-tag"));
    }
    const payload = await resolveTag("caribe-room-412");

    expect(payload).not.toBeNull();
    expect(payload?.tag.zone).toBe("room");
    expect(payload?.tag.roomNumber).toBe("412");
    expect(payload?.roomContext.isRoom).toBe(true);
    expect(payload?.roomContext.roomNumber).toBe("412");
    expect(payload?.roomContext.displayLabel).toBe("Habitación 412");
    expect(payload?.roomContext.welcomeHeadline).toContain("412");
  });

  it("returns null for invalid slug", async () => {
    if (!resolveTag) {
      ({ resolveTag } = await import("@/lib/tags/resolve-tag"));
    }
    const payload = await resolveTag("tag-inexistente-xyz");
    expect(payload).toBeNull();
  });
});