import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getAuthEnv } from "@/lib/env";

const COOKIE_NAME = "panoplive_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

type SessionPayload = {
  email: string;
  exp: number;
};

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function encode(payload: SessionPayload, secret: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(data, secret);
  return `${data}.${signature}`;
}

function decode(token: string, secret: string): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = sign(data, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!crypto.timingSafeEqual(left, right)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as SessionPayload;
  if (Date.now() / 1000 > payload.exp) return null;

  return payload;
}

export async function validateLogin(email: string, password: string) {
  const { adminEmail, adminPasswordHash } = getAuthEnv();
  if (email !== adminEmail) return false;
  return bcrypt.compare(password, adminPasswordHash);
}

export async function setAdminSession(email: string) {
  const { sessionSecret } = getAuthEnv();
  const token = encode(
    {
      email,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    },
    sessionSecret,
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentAdmin(): Promise<string | null> {
  const { sessionSecret } = getAuthEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decode(token, sessionSecret);
  return payload?.email ?? null;
}

export async function requireAdmin(): Promise<string> {
  const email = await getCurrentAdmin();
  if (!email) {
    throw new Error("UNAUTHORIZED");
  }
  return email;
}
