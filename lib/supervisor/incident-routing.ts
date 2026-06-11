import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { IncidentPriority } from "@/types/staff";

export interface IncidentCategoryRouting {
  code: string;
  label: string;
  defaultDepartmentId: string | null;
  defaultPriority: IncidentPriority;
}

export interface ResolvedIncidentRouting {
  departmentId: string | null;
  priority: IncidentPriority;
  category: IncidentCategoryRouting;
}

/**
 * Resolves category → department + default priority from venue_incident_categories.
 */
export async function resolveIncidentCategory(
  venueId: string,
  categoryCode: string,
): Promise<IncidentCategoryRouting | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("venue_incident_categories")
    .select("code, label, default_department_id, default_priority")
    .eq("venue_id", venueId)
    .eq("code", categoryCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    code: data.code as string,
    label: data.label as string,
    defaultDepartmentId: (data.default_department_id as string | null) ?? null,
    defaultPriority: data.default_priority as IncidentPriority,
  };
}

export async function routeIncidentByCategory(
  venueId: string,
  categoryCode: string,
  priorityOverride?: IncidentPriority,
): Promise<ResolvedIncidentRouting | null> {
  const category = await resolveIncidentCategory(venueId, categoryCode);
  if (!category) return null;

  return {
    category,
    departmentId: category.defaultDepartmentId,
    priority: priorityOverride ?? category.defaultPriority,
  };
}

export async function listActiveIncidentCategories(
  venueId: string,
): Promise<IncidentCategoryRouting[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("venue_incident_categories")
    .select("code, label, default_department_id, default_priority")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    code: row.code as string,
    label: row.label as string,
    defaultDepartmentId: (row.default_department_id as string | null) ?? null,
    defaultPriority: row.default_priority as IncidentPriority,
  }));
}