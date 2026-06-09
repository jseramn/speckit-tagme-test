import { createInsforgeServerClient } from "@/lib/insforge-server";

const RATE_LIMIT_MESSAGES = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface AvexSessionRow {
  id: string;
  sessionToken: string;
  tagId: string;
  venueId: string;
  roomNumber: string | null;
  messageCount: number;
  createdAt: string;
}

export async function getOrCreateSession(params: {
  sessionToken: string;
  tagId: string;
  venueId: string;
  roomNumber: string | null;
}): Promise<AvexSessionRow> {
  const insforge = createInsforgeServerClient();

  const { data: existing } = await insforge.database
    .from("avex_sessions")
    .select("id, session_token, tag_id, venue_id, room_number, message_count, created_at")
    .eq("session_token", params.sessionToken)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id as string,
      sessionToken: existing.session_token as string,
      tagId: existing.tag_id as string,
      venueId: existing.venue_id as string,
      roomNumber: (existing.room_number as string | null) ?? null,
      messageCount: existing.message_count as number,
      createdAt: existing.created_at as string,
    };
  }

  const { data: created, error } = await insforge.database
    .from("avex_sessions")
    .insert([
      {
        session_token: params.sessionToken,
        tag_id: params.tagId,
        venue_id: params.venueId,
        room_number: params.roomNumber,
        message_count: 0,
      },
    ])
    .select("id, session_token, tag_id, venue_id, room_number, message_count, created_at")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create AVEX session");
  }

  return {
    id: created.id as string,
    sessionToken: created.session_token as string,
    tagId: created.tag_id as string,
    venueId: created.venue_id as string,
    roomNumber: (created.room_number as string | null) ?? null,
    messageCount: created.message_count as number,
    createdAt: created.created_at as string,
  };
}

export async function checkRateLimit(
  session: AvexSessionRow,
): Promise<{ allowed: boolean; remaining: number }> {
  const insforge = createInsforgeServerClient();
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MS,
  ).toISOString();

  const { count, error } = await insforge.database
    .from("avex_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id)
    .eq("role", "user")
    .gte("created_at", windowStart);

  if (error) {
    return { allowed: true, remaining: RATE_LIMIT_MESSAGES };
  }

  const used = count ?? 0;
  return {
    allowed: used < RATE_LIMIT_MESSAGES,
    remaining: Math.max(0, RATE_LIMIT_MESSAGES - used),
  };
}

export async function fetchSessionHistory(
  sessionId: string,
  limit = 10,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const insforge = createInsforgeServerClient();

  const { data } = await insforge.database
    .from("avex_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content as string,
  }));
}

export async function persistAvexMessages(params: {
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  escalated: boolean;
}): Promise<void> {
  const insforge = createInsforgeServerClient();

  const { error: insertError } = await insforge.database
    .from("avex_messages")
    .insert([
      {
        session_id: params.sessionId,
        role: "user",
        content: params.userMessage,
        escalated: false,
      },
      {
        session_id: params.sessionId,
        role: "assistant",
        content: params.assistantMessage,
        escalated: params.escalated,
      },
    ]);

  if (insertError) {
    console.error("[avex] persist messages failed:", insertError.message);
    return;
  }

  const { data: session } = await insforge.database
    .from("avex_sessions")
    .select("message_count")
    .eq("id", params.sessionId)
    .maybeSingle();

  const currentCount = (session?.message_count as number) ?? 0;

  await insforge.database
    .from("avex_sessions")
    .update({ message_count: currentCount + 1 })
    .eq("id", params.sessionId);
}