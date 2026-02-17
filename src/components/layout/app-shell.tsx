import Link from "next/link";
import { FileText, FolderKanban, Scale } from "lucide-react";
import Image from "next/image";

import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-[image:var(--app-gradient)] text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/cases" className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/fge-puebla.png"
              alt="Fiscalia General del Estado de Puebla"
              width={248}
              height={101}
              className="h-9 w-auto shrink-0"
              priority
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SIGEA</p>
              <p className="truncate text-base font-semibold sm:text-lg">
                Sistema de Gestion Documental para Audiencias
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationPanel />
            <div className="hidden rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:block">
              {user.name} · {user.role}
            </div>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6">
          <Link href="/cases" className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <FolderKanban className="h-4 w-4" /> Casos
          </Link>
          <Link href="/records" className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <FileText className="h-4 w-4" /> Fichas
          </Link>
          <Link href="/reports" className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <Scale className="h-4 w-4" /> Dashboard
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
              Admin
            </Link>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
