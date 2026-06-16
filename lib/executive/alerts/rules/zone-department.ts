import type { ExecutiveScope } from "@/types/executive";

const ZONE_DEPARTMENT: Record<string, ExecutiveScope> = {
  lobby: "operations",
  room: "operations",
  other: "operations",
  restaurant: "fnb",
  bar: "fnb",
};

export function departmentForZone(zone: string): ExecutiveScope {
  return ZONE_DEPARTMENT[zone] ?? "operations";
}