import { AppShell } from "@/components/layout/app-shell";
import { requireSessionPage } from "@/lib/page-auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionPage();
  return <AppShell user={user}>{children}</AppShell>;
}
