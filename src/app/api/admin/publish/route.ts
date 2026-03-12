import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { commitGithubSiteContent } from "@/lib/github";
import { hasGithubEnv } from "@/lib/env";
import { writeLocalSiteContent } from "@/lib/site-content";
import type { SiteContent } from "@/types/content";

export async function POST(request: Request) {
  try {
    const adminEmail = await requireAdmin();
    const body = (await request.json()) as { content?: SiteContent; sha?: string | null };

    if (!body.content) {
      return NextResponse.json({ error: "Le contenu est requis." }, { status: 400 });
    }

    if (hasGithubEnv()) {
      if (!body.sha) {
        return NextResponse.json({ error: "SHA GitHub manquant." }, { status: 409 });
      }

      const result = await commitGithubSiteContent({
        content: body.content,
        sha: body.sha,
        authorEmail: adminEmail,
      });

      return NextResponse.json({ ok: true, result });
    }

    await writeLocalSiteContent(body.content);
    return NextResponse.json({ ok: true, local: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue.";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
