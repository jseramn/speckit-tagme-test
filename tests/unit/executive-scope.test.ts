import { describe, expect, it } from "vitest";
import {
  canAccessDashboard,
  canAccessZone,
  filterTagsByScope,
  filterZonesByScope,
  getAllowedScopes,
  getAccessibleDashboards,
} from "@/lib/executive/scope";
import type { ExecutiveScopeContext } from "@/lib/executive/scope";

const executiveCtx: ExecutiveScopeContext = {
  role: "executive",
  executiveScope: null,
};

const managerOpsCtx: ExecutiveScopeContext = {
  role: "manager",
  executiveScope: "operations",
};

const managerFnbCtx: ExecutiveScopeContext = {
  role: "manager",
  executiveScope: "fnb",
};

describe("executive-scope (CL-13)", () => {
  it("executive sees all scopes and dashboards", () => {
    expect(getAllowedScopes(executiveCtx)).toEqual([
      "operations",
      "fnb",
      "experience",
      "front_office",
    ]);
    expect(canAccessDashboard(executiveCtx, "overview")).toBe(true);
    expect(canAccessDashboard(executiveCtx, "fnb")).toBe(true);
    expect(canAccessDashboard(executiveCtx, "settings")).toBe(true);
    expect(canAccessZone(executiveCtx, "restaurant")).toBe(true);
    expect(canAccessZone(executiveCtx, "room")).toBe(true);
  });

  it("manager operations does not see fnb dashboard or restaurant zone", () => {
    expect(canAccessDashboard(managerOpsCtx, "operations")).toBe(true);
    expect(canAccessDashboard(managerOpsCtx, "fnb")).toBe(false);
    expect(canAccessZone(managerOpsCtx, "lobby")).toBe(true);
    expect(canAccessZone(managerOpsCtx, "room")).toBe(true);
    expect(canAccessZone(managerOpsCtx, "restaurant")).toBe(false);
    expect(canAccessZone(managerOpsCtx, "bar")).toBe(false);
  });

  it("manager fnb only sees restaurant and bar zones", () => {
    expect(getAccessibleDashboards(managerFnbCtx)).toContain("fnb");
    expect(getAccessibleDashboards(managerFnbCtx)).not.toContain("operations");
    expect(canAccessZone(managerFnbCtx, "restaurant")).toBe(true);
    expect(canAccessZone(managerFnbCtx, "bar")).toBe(true);
    expect(canAccessZone(managerFnbCtx, "lobby")).toBe(false);
  });

  it("filterTagsByScope excludes out-of-scope tags", () => {
    const tags = [
      { zone: "lobby", slug: "caribe-lobby" },
      { zone: "restaurant", slug: "caribe-restaurant" },
      { zone: "room", slug: "caribe-room-412" },
    ];

    const opsTags = filterTagsByScope(tags, managerOpsCtx);
    expect(opsTags.map((t) => t.zone)).toEqual(["lobby", "room"]);

    const fnbTags = filterTagsByScope(tags, managerFnbCtx);
    expect(fnbTags.map((t) => t.zone)).toEqual(["restaurant"]);
  });

  it("filterZonesByScope respects executive_scope", () => {
    const zones = ["lobby", "restaurant", "bar", "room", "other"];
    expect(filterZonesByScope(zones, executiveCtx)).toEqual(zones);
    expect(filterZonesByScope(zones, managerOpsCtx)).toEqual([
      "lobby",
      "room",
      "other",
    ]);
    expect(filterZonesByScope(zones, managerFnbCtx)).toEqual([
      "restaurant",
      "bar",
    ]);
  });
});