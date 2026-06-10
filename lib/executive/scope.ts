/**
 * RBAC scope matrix (CL-13).
 * Spec: specs/002-clevel/spec.md § CRÍTICO 4
 */

import type { ExecutiveRole, ExecutiveScope } from "@/types/executive";

export type ExecutiveDashboard =
  | "overview"
  | "operations"
  | "fnb"
  | "experience"
  | "front_office"
  | "alerts"
  | "reports"
  | "settings";

export interface ExecutiveScopeContext {
  role: ExecutiveRole;
  executiveScope: ExecutiveScope | null;
}

/** Zones visible per executive_scope (nfc_tags.zone). */
export const SCOPE_ZONES: Record<ExecutiveScope, readonly string[]> = {
  operations: ["lobby", "room", "other"],
  fnb: ["restaurant", "bar"],
  experience: ["lobby", "restaurant", "bar", "other"],
  front_office: ["lobby"],
};

const MANAGER_SCOPE_DASHBOARD: Record<ExecutiveScope, ExecutiveDashboard> = {
  operations: "operations",
  fnb: "fnb",
  experience: "experience",
  front_office: "front_office",
};

/**
 * Returns dashboards the session may access.
 */
export function getAccessibleDashboards(
  ctx: ExecutiveScopeContext,
): ExecutiveDashboard[] {
  const all: ExecutiveDashboard[] = [
    "overview",
    "operations",
    "fnb",
    "experience",
    "front_office",
    "alerts",
    "reports",
    "settings",
  ];

  if (ctx.role === "executive") {
    return all;
  }

  if (ctx.role === "manager" && ctx.executiveScope) {
    const primary = MANAGER_SCOPE_DASHBOARD[ctx.executiveScope];
    return [primary, "alerts"];
  }

  if (ctx.role === "department_head" && ctx.executiveScope) {
    const primary = MANAGER_SCOPE_DASHBOARD[ctx.executiveScope];
    return [primary, "alerts"];
  }

  return [];
}

/**
 * Whether a zone is visible for the given scope.
 */
export function isZoneInScope(
  zone: string,
  ctx: ExecutiveScopeContext,
): boolean {
  if (ctx.role === "executive") return true;
  if (!ctx.executiveScope) return false;
  return SCOPE_ZONES[ctx.executiveScope].includes(zone);
}

/** Filter tag-like records by executive scope using nfc_tags.zone. */
export function filterTagsByScope<T extends { zone: string }>(
  tags: T[],
  ctx: ExecutiveScopeContext,
): T[] {
  if (ctx.role === "executive") return tags;
  if (!ctx.executiveScope) return [];
  const allowed = SCOPE_ZONES[ctx.executiveScope];
  return tags.filter((t) => allowed.includes(t.zone));
}

/** Filter zone keys by executive scope. */
export function filterZonesByScope(
  zones: string[],
  ctx: ExecutiveScopeContext,
): string[] {
  if (ctx.role === "executive") return zones;
  if (!ctx.executiveScope) return [];
  const allowed = SCOPE_ZONES[ctx.executiveScope];
  return zones.filter((z) => allowed.includes(z));
}

/**
 * Assert session may access a dashboard route; throws if forbidden.
 */
export function assertDashboardAccess(
  dashboard: ExecutiveDashboard,
  ctx: ExecutiveScopeContext,
): void {
  const allowed = getAccessibleDashboards(ctx);
  if (!allowed.includes(dashboard)) {
    throw new Error(`FORBIDDEN: dashboard ${dashboard} not in scope`);
  }
}

/** Alias for CL-13 task naming (T012). */
export function getAllowedScopes(ctx: ExecutiveScopeContext): ExecutiveScope[] {
  if (ctx.role === "executive") {
    return ["operations", "fnb", "experience", "front_office"];
  }
  return ctx.executiveScope ? [ctx.executiveScope] : [];
}

/** Alias for CL-13 task naming (T012). */
export function canAccessDashboard(
  ctx: ExecutiveScopeContext,
  dashboard: ExecutiveDashboard,
): boolean {
  return getAccessibleDashboards(ctx).includes(dashboard);
}

/** Alias for CL-13 task naming (T012). */
export function canAccessZone(
  ctx: ExecutiveScopeContext,
  zone: string,
): boolean {
  return isZoneInScope(zone, ctx);
}