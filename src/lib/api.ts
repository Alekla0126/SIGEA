import { type ZodSchema } from "zod";
import { NextResponse } from "next/server";

import { getSession, type SessionUser } from "@/lib/auth";
import { can, type Action } from "@/lib/rbac";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: fail("Body invalido", 400, parsed.error.flatten()),
      data: null,
    };
  }

  return {
    error: null,
    data: parsed.data,
  };
}

export async function requireApiUser(action?: Action): Promise<
  | {
      user: SessionUser;
      error: null;
    }
  | {
      user: null;
      error: NextResponse;
    }
> {
  const user = await getSession();
  if (!user) {
    return { user: null, error: fail("No autenticado", 401) };
  }

  if (action && !can(user.role, action)) {
    return { user: null, error: fail("No autorizado", 403) };
  }

  return { user, error: null };
}
