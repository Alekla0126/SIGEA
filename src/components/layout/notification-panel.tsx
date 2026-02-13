"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  caseId?: string | null;
  recordId?: string | null;
  metadata?: unknown;
  isRead: boolean;
  createdAt: string;
};

function notificationHref(item: NotificationItem) {
  if (item.recordId) {
    const meta = item.metadata as { evidenceId?: string; artifactId?: string } | null;
    if (meta?.evidenceId) {
      return `/records/${item.recordId}#evidence-${meta.evidenceId}`;
    }
    if (meta?.artifactId) {
      return `/records/${item.recordId}#artifact-${meta.artifactId}`;
    }
    return `/records/${item.recordId}`;
  }

  if (item.caseId) {
    return `/cases/${item.caseId}`;
  }

  return null;
}

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) {
          return;
        }

        const json = await res.json();
        setItems(json.data ?? []);
      } catch {
        // silent
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) {
        throw new Error("No se pudo marcar como leida");
      }

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const openItem = (item: NotificationItem) => {
    const href = notificationHref(item);
    if (!href) {
      return;
    }

    setOpen(false);
    if (!item.isRead) {
      markRead(item.id).catch(() => {
        // ignore
      });
    }
    router.push(href);
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
        <Bell className="h-4 w-4" />
        Notificaciones
        {unreadCount > 0 ? (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 z-30 mt-2 w-[360px] max-w-[90vw]">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Bandeja interna</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-3 overflow-auto pb-4">
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Sin notificaciones.</p> : null}
            {items.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer rounded-md border border-border p-3 hover:bg-muted"
                role="button"
                tabIndex={0}
                onClick={() => openItem(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openItem(item);
                  }
                }}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {!item.isRead ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        markRead(item.id);
                      }}
                      className="h-auto px-1 py-0 text-muted-foreground"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
