import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCloudinarySignature } from "@/lib/cloudinary";

export async function POST() {
  try {
    await requireAdmin();
    const timestamp = Math.floor(Date.now() / 1000);
    return NextResponse.json(createCloudinarySignature(timestamp));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue.";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
