import { NextResponse } from "next/server";
import { setAdminSession, validateLogin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    const ok = await validateLogin(email, password);
    if (!ok) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    await setAdminSession(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inattendue." },
      { status: 500 },
    );
  }
}
