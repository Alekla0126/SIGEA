"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/auth/logout", { method: "POST" });
          if (!res.ok) {
            throw new Error("No se pudo cerrar sesion");
          }
          router.replace("/login");
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Error");
        } finally {
          setLoading(false);
        }
      }}
    >
      Cerrar sesion
    </Button>
  );
}
