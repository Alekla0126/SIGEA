import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Acceso denegado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Tu rol no tiene permiso para esta accion. Si necesitas acceso, solicita actualizacion al administrador.
          </p>
          <Link href="/cases">
            <Button>Volver a casos</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
