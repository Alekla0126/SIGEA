import Link from "next/link";
import { FileText, FolderKanban, Scale } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-[image:var(--app-gradient)] text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SIGEA</p>
            <p className="text-lg font-semibold">Sistema de Gestion Documental para Audiencias</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationPanel />
            <div className="hidden rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:block">
              {user.name} · {user.role}
            </div>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-1 px-4 pb-3 sm:px-6">
          <Link href="/cases" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <FolderKanban className="h-4 w-4" /> Casos
          </Link>
          <Link href="/records" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <FileText className="h-4 w-4" /> Fichas
          </Link>
          <Link href="/reports" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <Scale className="h-4 w-4" /> KPIs
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
              Admin
            </Link>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
