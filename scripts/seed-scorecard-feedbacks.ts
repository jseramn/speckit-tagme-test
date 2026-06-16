#!/usr/bin/env tsx
/**
 * Seed ≥6 staff_nfc feedbacks per pilot employee for scorecard testing (T101).
 *
 * Usage: npx tsx scripts/seed-scorecard-feedbacks.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const VENUE_SLUG = "hotel-caribe";
const FEEDBACKS_PER_EMPLOYEE = 8;
const SEED_TAG = "seed-f3-scorecard-feedbacks";

const RATING_PATTERN = [5, 5, 5, 4, 5, 3, 5, 2];

async function main() {
  const { createClient } = await import("@insforge/sdk");
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const serviceKey = process.env.INSFORGE_SERVICE_KEY?.trim();
  if (!baseUrl || !serviceKey) {
    throw new Error("Missing INSFORGE_URL or INSFORGE_SERVICE_KEY");
  }

  const insforge = createClient({ baseUrl, anonKey: serviceKey });

  const { data: venue } = await insforge.database
    .from("venues")
    .select("id")
    .eq("slug", VENUE_SLUG)
    .maybeSingle();

  if (!venue?.id) {
    throw new Error(`Venue ${VENUE_SLUG} not found — run seed:staff first`);
  }

  const { data: staffList } = await insforge.database
    .from("staff_members")
    .select("id, display_name, department_id")
    .eq("venue_id", venue.id)
    .eq("is_active", true);

  if (!staffList?.length) {
    throw new Error("No staff members found");
  }

  const { data: existingSeed } = await insforge.database
    .from("feedback_entries")
    .select("id")
    .eq("venue_id", venue.id)
    .contains("context_snapshot", { seed_tag: SEED_TAG })
    .limit(1);

  if (existingSeed?.length) {
    console.log("Scorecard seed feedbacks already exist — skipping");
    return;
  }

  const { data: stay } = await insforge.database
    .from("guest_stays")
    .select("id, stay_token")
    .eq("venue_id", venue.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  let stayId = stay?.id as string | undefined;

  if (!stayId) {
    const token = `seed-sc-${Date.now()}`;
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newStay } = await insforge.database
      .from("guest_stays")
      .insert([
        {
          venue_id: venue.id,
          stay_token: token,
          stay_type: "formal",
          status: "active",
          expires_at: expires,
        },
      ])
      .select("id")
      .single();
    stayId = newStay?.id as string;
  }

  const { data: tags } = await insforge.database
    .from("staff_nfc_tags")
    .select("id, staff_member_id")
    .eq("is_active", true);

  const tagByStaff = new Map(
    (tags ?? []).map((t) => [t.staff_member_id as string, t.id as string]),
  );

  let inserted = 0;

  for (const staff of staffList) {
    const tagId = tagByStaff.get(staff.id as string);
    if (!tagId) continue;

    for (let i = 0; i < FEEDBACKS_PER_EMPLOYEE; i++) {
      const rating = RATING_PATTERN[i % RATING_PATTERN.length];
      const daysAgo = i;
      const createdAt = new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error } = await insforge.database.from("feedback_entries").insert([
        {
          venue_id: venue.id,
          guest_stay_id: stayId,
          staff_member_id: staff.id,
          origin_type: "staff_nfc",
          origin_id: tagId,
          rating,
          comment: `Seed scorecard ${SEED_TAG}`,
          context_snapshot: {
            staff_member_id: staff.id,
            display_name: staff.display_name,
            department_id: staff.department_id,
            seed_tag: SEED_TAG,
          },
          created_at: createdAt,
        },
      ]);

      if (error) {
        console.warn(`Skip ${staff.display_name}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  console.log(
    `Inserted ${inserted} staff_nfc feedbacks (${FEEDBACKS_PER_EMPLOYEE}/employee target)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});