"use client";

import { Copy, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
    <div className="relative min-h-screen overflow-hidden bg-background bg-[image:var(--app-gradient)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-90">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-56 -right-56 h-[38rem] w-[38rem] rounded-full bg-[#DAC59A]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:56px_56px] dark:bg-[linear-gradient(to_right,rgba(226,232,240,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.06)_1px,transparent_1px)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-stretch gap-10 px-4 py-10 lg:grid-cols-2 lg:px-8 lg:py-14">
        <aside className="hidden flex-col justify-between rounded-3xl border border-border/60 bg-card/60 p-10 shadow-xl backdrop-blur lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <Image
                src="/brand/fge-puebla.png"
                alt="Fiscalia General del Estado de Puebla"
                width={248}
                height={101}
                priority
                className="h-12 w-auto"
              />
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-foreground">
              SIGEA
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Sistema de Gestion Documental para Audiencias. Captura, flujo de revision y generacion de documentos
              (Mampara / Ficha).
            </p>

            <div className="mt-8 grid gap-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flujo</div>
                <div className="mt-1 font-medium text-card-foreground">Flagrancia / MP → Litigacion → Supervision</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RBAC</div>
                <div className="mt-1 font-medium text-card-foreground">Flagrancia y MP CRUD completo · Litigacion solo edita</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salida</div>
                <div className="mt-1 font-medium text-card-foreground">PPTX y PDF (plantilla unica)</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Consejo: en iPhone, al generar PPTX/PDF la descarga se inicia en la misma pestana para que Safari la permita.
          </div>
        </aside>

        <main className="flex items-center justify-center">
          <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl backdrop-blur">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <Image
                  src="/brand/fge-puebla.png"
                  alt="Fiscalia General del Estado de Puebla"
                  width={248}
                  height={101}
                  priority
                  className="h-10 w-auto lg:hidden"
                />
                <div className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="mt-3 text-2xl">Acceso SIGEA</CardTitle>
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

              <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Credenciales demo
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(demoPassword)}
                    aria-label="Copiar password demo"
                    title="Copiar password"
                  >
                    <Copy className="h-4 w-4" /> Copiar password
                  </Button>
                </div>

                {/* Mobile: selector compacto */}
                <div className="space-y-2 sm:hidden">
                  <Label>Rol</Label>
                  <Select
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setPassword(demoPassword);
                    }}
                  >
                    {demoUsers.map((user) => (
                      <option key={user.role} value={user.email}>
                        {user.role}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyToClipboard(email)}
                    >
                      <Copy className="h-4 w-4" /> Copiar correo
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setPassword(demoPassword);
                      }}
                    >
                      Usar
                    </Button>
                  </div>
                </div>

                {/* Desktop: lista con acciones */}
                <div className="hidden space-y-2 sm:block">
                  {demoUsers.map((user) => (
                    <div
                      key={user.role}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/70 p-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{user.role}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
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

                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/70 p-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">Password</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{demoPassword}</div>
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
        </main>
      </div>
    </div>
  );
}
