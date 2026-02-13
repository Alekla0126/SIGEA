"use client";

import { Copy, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("flagrancia@sigea.local");
  const [password, setPassword] = useState("Sigea123!");
  const [loading, setLoading] = useState(false);

  const demoPassword = "Sigea123!";
  const demoUsers = [
    { role: "FLAGRANCIA", email: "flagrancia@sigea.local" },
    { role: "MP", email: "mp@sigea.local" },
    { role: "LITIGACION", email: "litigacion@sigea.local" },
    { role: "SUPERVISOR", email: "supervisor@sigea.local" },
    { role: "ADMIN", email: "admin@sigea.local" },
  ] as const;

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "No se pudo iniciar sesion");
      }

      toast.success("Sesion iniciada");
      router.replace("/cases");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0f172a,#1f4d66)] px-4 py-12">
      <Card className="w-full max-w-md border-white/20 bg-white/95 shadow-2xl backdrop-blur">
        <CardHeader>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f4d66] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Acceso SIGEA</CardTitle>
          <CardDescription>
            Inicia sesion con tus credenciales para gestionar casos, fichas y documentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@dominio.mx"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Credenciales demo (copiar)
            </div>
            <div className="space-y-2">
              {demoUsers.map((user) => (
                <div
                  key={user.role}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">{user.role}</div>
                    <div className="truncate text-xs text-slate-600">{user.email}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEmail(user.email);
                        setPassword(demoPassword);
                      }}
                    >
                      Usar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 px-0"
                      onClick={() => copyToClipboard(user.email)}
                      aria-label={`Copiar correo ${user.role}`}
                      title="Copiar correo"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">Password</div>
                <div className="truncate font-mono text-xs text-slate-600">{demoPassword}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 w-9 px-0"
                onClick={() => copyToClipboard(demoPassword)}
                aria-label="Copiar password demo"
                title="Copiar password"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
