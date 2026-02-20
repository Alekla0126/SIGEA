"use client";

import Link from "next/link";
import { FileText, FolderKanban, Menu, Scale, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background bg-[image:var(--app-gradient)] text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SIGEA</p>
            <p className="truncate text-sm font-semibold sm:text-lg">Sistema de Gestion Documental para Audiencias</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            <NotificationPanel />
            <div className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {user.name} · {user.role}
            </div>
            <LogoutButton />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="mx-auto hidden w-full max-w-7xl items-center gap-1 px-4 pb-3 sm:flex sm:px-6">
          <NavLinks role={user.role} />
        </nav>

        {mobileMenuOpen ? (
          <div className="border-t border-border px-4 pb-3 pt-2 sm:hidden">
            <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{user.name} · {user.role}</span>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <NotificationPanel />
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              <NavLinks role={user.role} mobile onNavigate={() => setMobileMenuOpen(false)} />
              <div className="pt-2">
                <LogoutButton />
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function NavLinks({
  role,
  mobile = false,
  onNavigate,
}: {
  role: SessionUser["role"];
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const baseClass = mobile
    ? "inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
    : "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted";

  return (
    <>
      <Link href="/cases" className={baseClass} onClick={onNavigate}>
        <FolderKanban className="h-4 w-4" /> Casos
      </Link>
      <Link href="/records" className={baseClass} onClick={onNavigate}>
        <FileText className="h-4 w-4" /> Fichas
      </Link>
      <Link href="/reports" className={baseClass} onClick={onNavigate}>
        <Scale className="h-4 w-4" /> KPIs
      </Link>
      {role === "ADMIN" ? (
        <Link href="/admin" className={baseClass} onClick={onNavigate}>
          Admin
        </Link>
      ) : null}
    </>
  );
}
