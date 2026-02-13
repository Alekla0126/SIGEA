"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationPanel() {
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
            {items.length === 0 ? <p className="text-sm text-slate-500">Sin notificaciones.</p> : null}
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {!item.isRead ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => markRead(item.id)}
                      className="h-auto px-1 py-0 text-slate-500"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
