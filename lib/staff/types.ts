import type { z } from "zod";
import type { staffSessionContextSchema } from "@/lib/validators/staff-session";

export type StaffSessionContext = z.infer<typeof staffSessionContextSchema>;