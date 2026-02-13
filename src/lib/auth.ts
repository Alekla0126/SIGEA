import { Role, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { appConfig } from "@/lib/config";

const SESSION_COOKIE = "sigea_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type SessionPayload = SessionUser & {
  iat?: number;
  exp?: number;
};

function getSecretKey() {
  return encoder.encode(appConfig.authSecret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function userToSession(user: Pick<User, "id" | "name" | "email" | "role">): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub && !payload.id) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.id || !payload?.role || !payload?.email || !payload?.name) {
    return null;
  }

  return {
    id: payload.id,
    role: payload.role,
    name: payload.name,
    email: payload.email,
  } as SessionUser;
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
