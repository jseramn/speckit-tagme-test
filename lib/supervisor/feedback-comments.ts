import type { StaffSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertDepartmentFilterAccess,
  supervisorScopeDepartmentIds,
} from "@/lib/supervisor/department-scope";

const DEFAULT_BLOCKLIST = [
  "idiota",
  "estúpido",
  "imbécil",
  "mierda",
  "puta",
  "puto",
];

export interface FeedbackCommentItem {
  feedbackId: string;
  rating: number;
  comment: string;
  staffMemberDisplayName: string | null;
  departmentName: string | null;
  createdAt: string;
  moderationFlag: boolean;
}

function flagComment(comment: string): boolean {
  const lower = comment.toLowerCase();
  return DEFAULT_BLOCKLIST.some((word) => lower.includes(word));
}

export async function listFeedbackComments(
  session: StaffSession,
  options: { departmentId?: string; limit?: number },
): Promise<{ items: FeedbackCommentItem[] }> {
  if (session.role === "staff") {
    throw new AuthError(
      "FORBIDDEN",
      "Staff operativo no tiene acceso a comentarios",
    );
  }

  const limit = options.limit ?? 50;
  const insforge = createInsforgeServerClient();
  const scope = await supervisorScopeDepartmentIds(session);

  if (options.departmentId) {
    await assertDepartmentFilterAccess(session, options.departmentId);
  }

  let query = insforge.database
    .from("feedback_entries")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      context_snapshot,
      staff_members ( display_name, department_id, departments ( name ) )
    `,
    )
    .eq("venue_id", session.venueId!)
    .not("comment", "is", null)
    .neq("comment", "")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items: FeedbackCommentItem[] = [];

  for (const row of data ?? []) {
    const staff = Array.isArray(row.staff_members)
      ? row.staff_members[0]
      : row.staff_members;
    const deptId = staff?.department_id as string | undefined;
    const deptName = staff?.departments
      ? Array.isArray(staff.departments)
        ? (staff.departments[0]?.name as string | undefined)
        : (staff.departments as { name: string }).name
      : null;

    if (options.departmentId && deptId !== options.departmentId) {
      continue;
    }

    if (scope !== null) {
      if (!deptId || !scope.includes(deptId)) continue;
    }

    const comment = row.comment as string;
    items.push({
      feedbackId: row.id as string,
      rating: row.rating as number,
      comment,
      staffMemberDisplayName: (staff?.display_name as string) ?? null,
      departmentName: deptName ?? null,
      createdAt: row.created_at as string,
      moderationFlag: flagComment(comment),
    });
  }

  return { items };
}