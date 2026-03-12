import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasGithubEnv } from "@/lib/env";
import { getGithubSiteContent } from "@/lib/github";
import { getStaticSiteContent } from "@/lib/site-content";

export async function GET() {
  try {
    await requireAdmin();

    if (hasGithubEnv()) {
      try {
        const result = await getGithubSiteContent();
        return NextResponse.json(result);
      } catch (error) {
        const fallback = getStaticSiteContent();
        const message = error instanceof Error ? error.message : "Erreur GitHub inconnue.";
        return NextResponse.json({
          content: fallback,
          sha: null,
          warning: `Lecture GitHub indisponible, fallback local utilisé. ${message}`,
        });
      }
    }

    return NextResponse.json({ content: getStaticSiteContent(), sha: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue.";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
