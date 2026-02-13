import { AdminPanel } from "@/components/admin/admin-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionPage } from "@/lib/page-auth";

export default async function AdminPage() {
  await requireSessionPage("user:manage");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Administracion SIGEA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Alta/baja de usuarios y catalogos por rol ADMIN.
          </p>
        </CardContent>
      </Card>
      <AdminPanel />
    </div>
  );
}
