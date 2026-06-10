#!/usr/bin/env tsx
/**
 * Manual alert evaluation for local dev (M3).
 * Usage: npm run alerts:evaluate
 *        npm run alerts:evaluate -- --venue=<uuid>
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateAlertsForVenue,
  evaluateAllPilotVenues,
} from "../lib/executive/alerts/evaluate";

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

async function main() {
  const venueArg = process.argv.find((a) => a.startsWith("--venue="));
  const venueId = venueArg?.split("=")[1];

  const results = venueId
    ? [await evaluateAlertsForVenue(venueId)]
    : await evaluateAllPilotVenues();

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});