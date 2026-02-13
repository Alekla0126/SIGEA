import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { can, type Action } from "@/lib/rbac";

export async function requireSessionPage(action?: Action) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (action && !can(session.role, action)) {
    redirect("/forbidden");
  }

  return session;
}
