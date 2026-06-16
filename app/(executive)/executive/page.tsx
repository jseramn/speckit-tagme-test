import { redirect } from "next/navigation";
import { getSession, isExecutiveSession } from "@/lib/auth/session";
import { getAccessibleDashboards } from "@/lib/executive/scope";

const DASHBOARD_HOME: Record<string, string> = {
  overview: "/executive/overview",
  operations: "/executive/operations",
  front_office: "/executive/front-office",
  fnb: "/executive/fnb",
  experience: "/executive/experience",
  alerts: "/executive/alerts",
};

export default async function ExecutiveIndexPage() {
  const session = await getSession();
  if (!session || !isExecutiveSession(session)) {
    redirect("/login?next=/executive/overview");
  }

  const dashboards = getAccessibleDashboards({
    role: session.role,
    executiveScope: session.executiveScope,
  });

  const primary =
    dashboards.find((d) => d !== "alerts" && d !== "reports" && d !== "settings") ??
    "alerts";

  redirect(DASHBOARD_HOME[primary] ?? "/executive/alerts");
}