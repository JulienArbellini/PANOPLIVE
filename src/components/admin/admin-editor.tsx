"use client";

import { useEffect, useMemo, useState } from "react";
import { SitePageContent } from "@/components/site/page-content";
import type { SiteContent } from "@/types/content";

type AdminEditorProps = {
  adminEmail: string;
};

type ContentApiResponse = {
  content: SiteContent;
  sha: string | null;
  warning?: string;
};

type FieldKind = "text" | "textarea" | "url" | "email" | "image";

const DRAFT_KEY = "panoplive_admin_draft_v1";

function updateById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function resolveField(content: SiteContent, fieldId: string): {
  label: string;
  kind: FieldKind;
  value: string;
  set: (value: string) => SiteContent;
} | null {
  const albumStreaming = content.album.streaming ?? {};

  const simple: Record<
    string,
    {
      label: string;
      kind: FieldKind;
      value: string;
      set: (value: string) => SiteContent;
    }
  > = {
    "navigation.logo": {
      label: "Logo",
      kind: "text",
      value: content.navigation.logo,
      set: (value) => ({ ...content, navigation: { ...content.navigation, logo: value } }),
    },
    "hero.mantra": {
      label: "Mantra",
      kind: "text",
      value: content.hero.mantra,
      set: (value) => ({ ...content, hero: { ...content.hero, mantra: value } }),
    },
    "hero.bandName": {
      label: "Nom du groupe",
      kind: "text",
      value: content.hero.bandName,
      set: (value) => ({ ...content, hero: { ...content.hero, bandName: value } }),
    },
    "hero.subtitle": {
      label: "Sous-titre",
      kind: "text",
      value: content.hero.subtitle,
      set: (value) => ({ ...content, hero: { ...content.hero, subtitle: value } }),
    },
    "hero.kicker": {
      label: "Baseline",
      kind: "textarea",
      value: content.hero.kicker,
      set: (value) => ({ ...content, hero: { ...content.hero, kicker: value } }),
    },
    "hero.mirrorImageUrl": {
      label: "Image miroir",
      kind: "image",
      value: content.hero.mirrorImageUrl,
      set: (value) => ({ ...content, hero: { ...content.hero, mirrorImageUrl: value } }),
    },
    "album.label": {
      label: "Label album",
      kind: "text",
      value: content.album.label,
      set: (value) => ({ ...content, album: { ...content.album, label: value } }),
    },
    "album.title": {
      label: "Titre album",
      kind: "text",
      value: content.album.title,
      set: (value) => ({ ...content, album: { ...content.album, title: value } }),
    },
    "album.description": {
      label: "Description album",
      kind: "textarea",
      value: content.album.description,
      set: (value) => ({ ...content, album: { ...content.album, description: value } }),
    },
    "album.ctaLabel": {
      label: "Bouton album",
      kind: "text",
      value: content.album.ctaLabel,
      set: (value) => ({ ...content, album: { ...content.album, ctaLabel: value } }),
    },
    "album.coverImageUrl": {
      label: "Image album",
      kind: "image",
      value: content.album.coverImageUrl,
      set: (value) => ({ ...content, album: { ...content.album, coverImageUrl: value } }),
    },
    "album.streaming.spotifyEmbedUrl": {
      label: "Spotify embed URL",
      kind: "url",
      value: albumStreaming.spotifyEmbedUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, spotifyEmbedUrl: value },
        },
      }),
    },
    "album.streaming.spotifyUrl": {
      label: "Spotify URL",
      kind: "url",
      value: albumStreaming.spotifyUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, spotifyUrl: value },
        },
      }),
    },
    "album.streaming.appleMusicUrl": {
      label: "Apple Music URL",
      kind: "url",
      value: albumStreaming.appleMusicUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, appleMusicUrl: value },
        },
      }),
    },
    "album.streaming.deezerUrl": {
      label: "Deezer URL",
      kind: "url",
      value: albumStreaming.deezerUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, deezerUrl: value },
        },
      }),
    },
    "album.streaming.youtubeMusicUrl": {
      label: "YouTube Music URL",
      kind: "url",
      value: albumStreaming.youtubeMusicUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, youtubeMusicUrl: value },
        },
      }),
    },
    "album.streaming.youtubePlaylistUrl": {
      label: "YouTube Playlist URL",
      kind: "url",
      value: albumStreaming.youtubePlaylistUrl ?? "",
      set: (value) => ({
        ...content,
        album: {
          ...content.album,
          streaming: { ...albumStreaming, youtubePlaylistUrl: value },
        },
      }),
    },
    "clips.title": {
      label: "Titre section clips",
      kind: "text",
      value: content.clips.title,
      set: (value) => ({ ...content, clips: { ...content.clips, title: value } }),
    },
    "concerts.title": {
      label: "Titre section concerts",
      kind: "text",
      value: content.concerts.title,
      set: (value) => ({ ...content, concerts: { ...content.concerts, title: value } }),
    },
    "group.title": {
      label: "Titre section groupe",
      kind: "text",
      value: content.group.title,
      set: (value) => ({ ...content, group: { ...content.group, title: value } }),
    },
    "insta.title": {
      label: "Titre Instagram",
      kind: "text",
      value: content.insta.title,
      set: (value) => ({ ...content, insta: { ...content.insta, title: value } }),
    },
    "footer.contactEmail": {
      label: "Email contact",
      kind: "email",
      value: content.footer.contactEmail,
      set: (value) => ({ ...content, footer: { ...content.footer, contactEmail: value } }),
    },
  };

  if (simple[fieldId]) return simple[fieldId];

  const navMatch = fieldId.match(/^navigation\.links\.(\d+)\.label$/);
  if (navMatch) {
    const idx = Number(navMatch[1]);
    const item = content.navigation.links[idx];
    if (!item) return null;
    return {
      label: `Navigation ${idx + 1}`,
      kind: "text",
      value: item.label,
      set: (value) => ({
        ...content,
        navigation: {
          ...content.navigation,
          links: content.navigation.links.map((link, index) => (index === idx ? { ...link, label: value } : link)),
        },
      }),
    };
  }

  const clipMatch = fieldId.match(/^clips\.items\.([^\.]+)\.(title|caption|imageUrl|videoUrl)$/);
  if (clipMatch) {
    const [, id, rawKey] = clipMatch;
    const key = rawKey as "title" | "caption" | "imageUrl" | "videoUrl";
    const clip = content.clips.items.find((item) => item.id === id);
    if (!clip) return null;
    return {
      label: `Clip ${clip.title} (${key})`,
      kind: key === "imageUrl" ? "image" : key === "videoUrl" ? "url" : key === "caption" ? "textarea" : "text",
      value: clip[key],
      set: (value) => ({
        ...content,
        clips: { ...content.clips, items: updateById(content.clips.items, id, { [key]: value }) },
      }),
    };
  }

  const concertMatch = fieldId.match(/^concerts\.items\.([^\.]+)\.(dateDisplay|venue|city)$/);
  if (concertMatch) {
    const [, id, rawKey] = concertMatch;
    const key = rawKey as "dateDisplay" | "venue" | "city";
    const concert = content.concerts.items.find((item) => item.id === id);
    if (!concert) return null;
    return {
      label: `Concert ${concert.venue} (${key})`,
      kind: "text",
      value: concert[key],
      set: (value) => ({
        ...content,
        concerts: { ...content.concerts, items: updateById(content.concerts.items, id, { [key]: value }) },
      }),
    };
  }

  const memberMatch = fieldId.match(/^group\.members\.([^\.]+)\.(name|roleText|imageUrl)$/);
  if (memberMatch) {
    const [, id, rawKey] = memberMatch;
    const key = rawKey as "name" | "roleText" | "imageUrl";
    const member = content.group.members.find((item) => item.id === id);
    if (!member) return null;
    return {
      label: `Membre ${member.name} (${key})`,
      kind: key === "imageUrl" ? "image" : key === "roleText" ? "textarea" : "text",
      value: member[key],
      set: (value) => ({
        ...content,
        group: { ...content.group, members: updateById(content.group.members, id, { [key]: value }) },
      }),
    };
  }

  const instaMatch = fieldId.match(/^insta\.items\.([^\.]+)\.imageUrl$/);
  if (instaMatch) {
    const [, id] = instaMatch;
    const insta = content.insta.items.find((item) => item.id === id);
    if (!insta) return null;
    return {
      label: `Image ${id}`,
      kind: "image",
      value: insta.imageUrl,
      set: (value) => ({ ...content, insta: { ...content.insta, items: updateById(content.insta.items, id, { imageUrl: value }) } }),
    };
  }

  return null;
}

async function uploadToCloudinary(file: File) {
  const signResponse = await fetch("/api/admin/cloudinary/sign", { method: "POST" });
  const signData = (await signResponse.json()) as {
    signature?: string;
    timestamp?: number;
    apiKey?: string;
    cloudName?: string;
    error?: string;
  };

  if (!signResponse.ok || !signData.signature || !signData.timestamp || !signData.apiKey || !signData.cloudName) {
    throw new Error(signData.error || "Impossible de signer l'upload Cloudinary.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", String(signData.timestamp));
  formData.append("signature", signData.signature);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const uploadData = (await uploadResponse.json()) as { secure_url?: string; error?: { message?: string } };
  if (!uploadResponse.ok || !uploadData.secure_url) {
    throw new Error(uploadData.error?.message || "Upload Cloudinary échoué.");
  }

  return uploadData.secure_url;
}

export function AdminEditor({ adminEmail }: AdminEditorProps) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [serverContent, setServerContent] = useState<SiteContent | null>(null);
  const [githubSha, setGithubSha] = useState<string | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadFromApi() {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    const data = (await response.json()) as ContentApiResponse & { error?: string };
    if (!response.ok) throw new Error(data.error || "Impossible de charger le contenu.");

    setServerContent(data.content);
    setGithubSha(data.sha);

    const localDraft = localStorage.getItem(DRAFT_KEY);
    if (localDraft) {
      setContent(JSON.parse(localDraft) as SiteContent);
      setNotice("Brouillon local restauré.");
    } else {
      setContent(data.content);
      setNotice(data.warning || null);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadFromApi();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur chargement.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!content) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(content));
  }, [content]);

  const activeField = useMemo(() => {
    if (!content || !activeFieldId) return null;
    return resolveField(content, activeFieldId);
  }, [content, activeFieldId]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  async function publish() {
    if (!content) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sha: githubSha }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Publication échouée.");
      }

      localStorage.removeItem(DRAFT_KEY);
      setNotice("Contenu publié avec succès.");
      await loadFromApi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication échouée.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraft() {
    if (!content) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(content));
    setNotice("Brouillon enregistré localement.");
  }

  function cancelDraft() {
    if (!serverContent) return;
    localStorage.removeItem(DRAFT_KEY);
    setContent(serverContent);
    setActiveFieldId(null);
    setNotice("Brouillon annulé, contenu réinitialisé.");
    setError(null);
  }

  if (loading) {
    return <main className="cursor-auto min-h-screen bg-slate-950 p-6 text-white">Chargement...</main>;
  }

  if (!content) {
    return (
      <main className="cursor-auto min-h-screen bg-slate-950 p-6 text-white">
        <p>Contenu introuvable.</p>
      </main>
    );
  }

  return (
    <main className="cursor-auto min-h-screen text-white">
      <header className="fixed top-0 left-0 z-[1200] w-full border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div className="text-xs tracking-[0.2em] uppercase text-cyan-200">Mode édition visuel actif</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">Bonjour, {adminEmail}</span>
            <button onClick={logout} className="rounded-md border border-white/25 px-3 py-1.5 text-xs uppercase hover:bg-white/10">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14">
        <SitePageContent content={content} showEffects editMode onEditField={setActiveFieldId} />
      </div>

      {activeField ? (
        <aside className="fixed top-20 right-4 z-[1300] w-[92vw] max-w-md rounded-xl border border-white/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[0.15em] text-cyan-200 uppercase">Modifier</h2>
            <button className="text-xs text-white/60" onClick={() => setActiveFieldId(null)}>
              Fermer
            </button>
          </div>

          <p className="mb-2 text-xs text-white/60">{activeField.label}</p>

          {activeField.kind === "textarea" ? (
            <textarea
              className="min-h-28 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
              value={activeField.value}
              onChange={(event) => setContent(activeField.set(event.target.value))}
            />
          ) : (
            <input
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
              type={activeField.kind === "email" ? "email" : activeField.kind === "url" ? "url" : "text"}
              value={activeField.value}
              onChange={(event) => setContent(activeField.set(event.target.value))}
            />
          )}

          {activeField.kind === "image" ? (
            <div className="mt-3">
              <label className="inline-block cursor-pointer rounded-md border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-cyan-100 uppercase hover:bg-cyan-500/30">
                {uploading ? "Upload..." : "Uploader image"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file || !activeField) return;

                    setUploading(true);
                    setError(null);
                    try {
                      const url = await uploadToCloudinary(file);
                      setContent(activeField.set(url));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erreur upload.");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          ) : null}
        </aside>
      ) : null}

      <footer className="fixed bottom-0 left-0 z-[1250] w-full border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/70">{notice || "0 changement(s) en attente"}</div>
          <div className="flex items-center gap-2">
            <button onClick={saveDraft} className="rounded-md border border-white/20 px-3 py-2 text-xs tracking-[0.08em] uppercase hover:bg-white/10">
              Enregistrer brouillon
            </button>
            <button
              onClick={publish}
              disabled={saving}
              className="rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-950 uppercase disabled:opacity-60"
            >
              {saving ? "Publication..." : "Publier cette page"}
            </button>
            <button onClick={cancelDraft} className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-xs tracking-[0.08em] text-white uppercase hover:bg-black/50">
              Annuler brouillon
            </button>
          </div>
        </div>
        {error ? <p className="mx-auto mt-2 w-full max-w-7xl text-sm text-red-300">{error}</p> : null}
      </footer>
    </main>
  );
}
