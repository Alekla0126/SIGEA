import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { fail, ok, parseBody } from "@/lib/api";
import { setSessionCookie, userToSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    return fail("Credenciales invalidas", 401);
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return fail("Credenciales invalidas", 401);
  }

  const session = userToSession(user);
  await setSessionCookie(session);

  return ok({ user: session });
}
