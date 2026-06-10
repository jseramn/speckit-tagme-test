import { spawnSync } from "node:child_process";

export interface AuthUserRow {
  id: string;
  email: string;
  email_verified: boolean;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Runs read/write SQL via InsForge CLI (service role).
 * Requires `npx @insforge/cli` linked to the project.
 */
export function runInsforgeDbQuery<T extends Record<string, unknown>>(
  sql: string,
): T[] {
  const command = `npx @insforge/cli db query ${JSON.stringify(sql)} --json`;
  const result = spawnSync(command, {
    encoding: "utf8",
    shell: true,
    env: process.env,
  });

  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";

  if (result.status !== 0) {
    let message = stderr || stdout || `exit ${result.status}`;
    try {
      const parsed = JSON.parse(stdout || stderr) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // keep raw message
    }
    throw new Error(`InsForge db query failed: ${message}`);
  }

  if (!stdout) return [];

  const parsed = JSON.parse(stdout) as { rows?: T[] };
  return parsed.rows ?? [];
}

export function findAuthUserByEmail(email: string): AuthUserRow | null {
  const rows = runInsforgeDbQuery<AuthUserRow>(
    `SELECT id, email, email_verified FROM auth.users WHERE email = '${escapeSqlLiteral(email)}' LIMIT 1`,
  );
  return rows[0] ?? null;
}

export function verifyAuthUserEmail(authUserId: string): void {
  runInsforgeDbQuery(
    `UPDATE auth.users SET email_verified = true WHERE id = '${authUserId}'`,
  );
}