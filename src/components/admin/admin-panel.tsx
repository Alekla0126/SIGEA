"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "FLAGRANCIA" | "MP" | "LITIGACION" | "SUPERVISOR" | "ADMIN";
  isActive: boolean;
};

type CatalogItem = {
  id: string;
  category: string;
  code: string;
  label: string;
  isActive: boolean;
};

export function AdminPanel() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "FLAGRANCIA",
  });

  const [newCatalog, setNewCatalog] = useState({
    category: "AUDIENCIA_TIPO",
    code: "",
    label: "",
  });

  const loadAll = async () => {
    const [usersRes, catalogsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/catalogs"),
    ]);

    if (usersRes.ok) {
      const usersJson = await usersRes.json();
      setUsers(usersJson.data || []);
    }

    if (catalogsRes.ok) {
      const catalogsJson = await catalogsRes.json();
      setCatalogs(catalogsJson.data || []);
    }
  };

  useEffect(() => {
    loadAll().catch(() => null);
  }, []);

  const createUser = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, isActive: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo crear usuario");
      }

      setNewUser({ name: "", email: "", password: "", role: "FLAGRANCIA" });
      toast.success("Usuario creado");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = async (user: UserItem) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo actualizar usuario");
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Eliminar usuario?")) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo borrar usuario");
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const createCatalog = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCatalog, isActive: true }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo crear catalogo");
      }
      setNewCatalog({ category: "AUDIENCIA_TIPO", code: "", label: "" });
      toast.success("Catalogo creado");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCatalog = async (id: string) => {
    if (!confirm("Eliminar item de catalogo?")) {
      return;
    }

    try {
      const response = await fetch(`/api/catalogs/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo borrar catalogo");
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Nombre</Label>
              <Input value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={newUser.password} onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))} />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={newUser.role} onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as UserItem["role"] }))}>
                <option value="FLAGRANCIA">FLAGRANCIA</option>
                <option value="MP">MP</option>
                <option value="LITIGACION">LITIGACION</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </Select>
            </div>
          </div>
          <Button onClick={createUser} disabled={loading}>Crear usuario</Button>

          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between rounded-md border border-slate-200 p-3">
                <p className="text-sm text-slate-700">{user.name} · {user.email} · {user.role}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleUser(user)}>
                    {user.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id)}>Borrar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalogos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Categoria</Label>
              <Input value={newCatalog.category} onChange={(event) => setNewCatalog((prev) => ({ ...prev, category: event.target.value }))} />
            </div>
            <div>
              <Label>Codigo</Label>
              <Input value={newCatalog.code} onChange={(event) => setNewCatalog((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div>
              <Label>Etiqueta</Label>
              <Input value={newCatalog.label} onChange={(event) => setNewCatalog((prev) => ({ ...prev, label: event.target.value }))} />
            </div>
          </div>
          <Button onClick={createCatalog} disabled={loading}>Crear catalogo</Button>

          <div className="space-y-2">
            {catalogs.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between rounded-md border border-slate-200 p-3">
                <p className="text-sm text-slate-700">{item.category} · {item.code} · {item.label}</p>
                <Button size="sm" variant="destructive" onClick={() => deleteCatalog(item.id)}>Borrar</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
