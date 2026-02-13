import Link from "next/link";
import { FileText, FolderKanban, Scale } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationPanel } from "@/components/layout/notification-panel";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fafc,#e2e8f0)] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SIGEA</p>
            <p className="text-lg font-semibold">Sistema de Gestion Documental para Audiencias</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationPanel />
            <div className="hidden rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:block">
              {user.name} · {user.role}
            </div>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-1 px-4 pb-3 sm:px-6">
          <Link href="/cases" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
            <FolderKanban className="h-4 w-4" /> Casos
          </Link>
          <Link href="/cases" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
            <FileText className="h-4 w-4" /> Fichas
          </Link>
          <Link href="/reports" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
            <Scale className="h-4 w-4" /> KPIs
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100">
              Admin
            </Link>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
