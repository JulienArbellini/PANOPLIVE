"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteContent } from "@/types/content";

type AdminEditorProps = {
  adminEmail: string;
};

type ContentApiResponse = {
  content: SiteContent;
  sha: string | null;
};

const DRAFT_KEY = "panoplive_admin_draft_v1";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold text-cyan-300">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "email";
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/70">{label}</span>
      <input
        className="w-full rounded-md border border-white/15 bg-slate-900/60 px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/70">{label}</span>
      <textarea
        className="min-h-24 w-full rounded-md border border-white/15 bg-slate-900/60 px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(file: File) {
    setLoading(true);
    setError(null);

    try {
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

      onChange(uploadData.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-white/10 p-3">
      <Input label={label} value={value} onChange={onChange} type="url" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md border border-cyan-500/40 px-3 py-2 text-xs hover:bg-cyan-500/10">
          {loading ? "Upload..." : "Uploader sur Cloudinary"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {value ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline">
            Voir image
          </a>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function AdminEditor({ adminEmail }: AdminEditorProps) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [githubSha, setGithubSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const response = await fetch("/api/admin/content", { cache: "no-store" });
        const data = (await response.json()) as ContentApiResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Impossible de charger le contenu.");
        }

        const localDraft = localStorage.getItem(DRAFT_KEY);
        if (localDraft) {
          setContent(JSON.parse(localDraft) as SiteContent);
          setNotice("Brouillon local restauré.");
        } else {
          setContent(data.content);
        }

        setGithubSha(data.sha);
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

  const clipCount = useMemo(() => content?.clips.items.length ?? 0, [content]);

  function update(next: SiteContent) {
    setContent(next);
    setNotice(null);
    setError(null);
  }

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

      const refreshResponse = await fetch("/api/admin/content", { cache: "no-store" });
      const refreshData = (await refreshResponse.json()) as ContentApiResponse;
      if (refreshResponse.ok) {
        setGithubSha(refreshData.sha);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication échouée.");
    } finally {
      setSaving(false);
    }
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
    <main className="cursor-auto min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Édition du site Panoplive</h1>
            <p className="text-sm text-white/60">Connecté en tant que {adminEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
              Déconnexion
            </button>
            <button
              onClick={publish}
              disabled={saving}
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {saving ? "Publication..." : "Publier"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:grid-cols-[1fr_320px] md:p-6">
        <div className="space-y-6">
          <Section title="SEO et navigation">
            <Input label="Titre SEO" value={content.seo.title} onChange={(value) => update({ ...content, seo: { ...content.seo, title: value } })} />
            <Textarea
              label="Description SEO"
              value={content.seo.description}
              onChange={(value) => update({ ...content, seo: { ...content.seo, description: value } })}
            />
            <Input
              label="Logo"
              value={content.navigation.logo}
              onChange={(value) => update({ ...content, navigation: { ...content.navigation, logo: value } })}
            />
            <ImageInput
              label="Image de fond"
              value={content.backgroundImageUrl}
              onChange={(value) => update({ ...content, backgroundImageUrl: value })}
            />
          </Section>

          <Section title="Hero">
            <Input label="Mantra" value={content.hero.mantra} onChange={(value) => update({ ...content, hero: { ...content.hero, mantra: value } })} />
            <Input label="Nom du groupe" value={content.hero.bandName} onChange={(value) => update({ ...content, hero: { ...content.hero, bandName: value } })} />
            <Input label="Sous-titre" value={content.hero.subtitle} onChange={(value) => update({ ...content, hero: { ...content.hero, subtitle: value } })} />
            <Textarea label="Baseline" value={content.hero.kicker} onChange={(value) => update({ ...content, hero: { ...content.hero, kicker: value } })} />
            <ImageInput
              label="Image miroir"
              value={content.hero.mirrorImageUrl}
              onChange={(value) => update({ ...content, hero: { ...content.hero, mirrorImageUrl: value } })}
            />
          </Section>

          <Section title="Album">
            <Input label="Label" value={content.album.label} onChange={(value) => update({ ...content, album: { ...content.album, label: value } })} />
            <Input label="Titre" value={content.album.title} onChange={(value) => update({ ...content, album: { ...content.album, title: value } })} />
            <Textarea
              label="Description"
              value={content.album.description}
              onChange={(value) => update({ ...content, album: { ...content.album, description: value } })}
            />
            <Input label="Texte bouton" value={content.album.ctaLabel} onChange={(value) => update({ ...content, album: { ...content.album, ctaLabel: value } })} />
            <Input label="URL bouton" value={content.album.ctaUrl} onChange={(value) => update({ ...content, album: { ...content.album, ctaUrl: value } })} type="url" />
            <ImageInput
              label="Image pochette"
              value={content.album.coverImageUrl}
              onChange={(value) => update({ ...content, album: { ...content.album, coverImageUrl: value } })}
            />
          </Section>

          <Section title="Clips">
            <Input label="Label" value={content.clips.label} onChange={(value) => update({ ...content, clips: { ...content.clips, label: value } })} />
            <Input label="Titre" value={content.clips.title} onChange={(value) => update({ ...content, clips: { ...content.clips, title: value } })} />
            {content.clips.items.map((clip, index) => (
              <div key={clip.id} className="space-y-2 rounded-md border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Clip {index + 1}</h3>
                  <button
                    type="button"
                    className="text-xs text-red-300"
                    onClick={() =>
                      update({ ...content, clips: { ...content.clips, items: content.clips.items.filter((item) => item.id !== clip.id) } })
                    }
                  >
                    Supprimer
                  </button>
                </div>
                <Input
                  label="Titre"
                  value={clip.title}
                  onChange={(value) =>
                    update({
                      ...content,
                      clips: {
                        ...content.clips,
                        items: content.clips.items.map((item) => (item.id === clip.id ? { ...item, title: value } : item)),
                      },
                    })
                  }
                />
                <Input
                  label="Caption"
                  value={clip.caption}
                  onChange={(value) =>
                    update({
                      ...content,
                      clips: {
                        ...content.clips,
                        items: content.clips.items.map((item) => (item.id === clip.id ? { ...item, caption: value } : item)),
                      },
                    })
                  }
                />
                <Input
                  label="URL vidéo"
                  value={clip.videoUrl}
                  onChange={(value) =>
                    update({
                      ...content,
                      clips: {
                        ...content.clips,
                        items: content.clips.items.map((item) => (item.id === clip.id ? { ...item, videoUrl: value } : item)),
                      },
                    })
                  }
                  type="url"
                />
                <ImageInput
                  label="Image clip"
                  value={clip.imageUrl}
                  onChange={(value) =>
                    update({
                      ...content,
                      clips: {
                        ...content.clips,
                        items: content.clips.items.map((item) => (item.id === clip.id ? { ...item, imageUrl: value } : item)),
                      },
                    })
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10"
              onClick={() =>
                update({
                  ...content,
                  clips: {
                    ...content.clips,
                    items: [
                      ...content.clips.items,
                      {
                        id: uid("clip"),
                        title: "Nouveau clip",
                        caption: "Réalisé par ...",
                        imageUrl: "",
                        videoUrl: "#",
                      },
                    ],
                  },
                })
              }
            >
              Ajouter un clip
            </button>
          </Section>

          <Section title="Concerts">
            <Input label="Label" value={content.concerts.label} onChange={(value) => update({ ...content, concerts: { ...content.concerts, label: value } })} />
            <Input label="Titre" value={content.concerts.title} onChange={(value) => update({ ...content, concerts: { ...content.concerts, title: value } })} />
            {content.concerts.items.map((concert) => (
              <div key={concert.id} className="space-y-2 rounded-md border border-white/10 p-3">
                <Input
                  label="Date affichée"
                  value={concert.dateDisplay}
                  onChange={(value) =>
                    update({
                      ...content,
                      concerts: {
                        ...content.concerts,
                        items: content.concerts.items.map((item) =>
                          item.id === concert.id ? { ...item, dateDisplay: value } : item,
                        ),
                      },
                    })
                  }
                />
                <Input
                  label="Lieu"
                  value={concert.venue}
                  onChange={(value) =>
                    update({
                      ...content,
                      concerts: {
                        ...content.concerts,
                        items: content.concerts.items.map((item) => (item.id === concert.id ? { ...item, venue: value } : item)),
                      },
                    })
                  }
                />
                <Input
                  label="Ville"
                  value={concert.city}
                  onChange={(value) =>
                    update({
                      ...content,
                      concerts: {
                        ...content.concerts,
                        items: content.concerts.items.map((item) => (item.id === concert.id ? { ...item, city: value } : item)),
                      },
                    })
                  }
                />
                <Input
                  label="Label CTA"
                  value={concert.ctaLabel}
                  onChange={(value) =>
                    update({
                      ...content,
                      concerts: {
                        ...content.concerts,
                        items: content.concerts.items.map((item) =>
                          item.id === concert.id ? { ...item, ctaLabel: value } : item,
                        ),
                      },
                    })
                  }
                />
                <Input
                  label="URL CTA"
                  value={concert.ctaUrl}
                  onChange={(value) =>
                    update({
                      ...content,
                      concerts: {
                        ...content.concerts,
                        items: content.concerts.items.map((item) => (item.id === concert.id ? { ...item, ctaUrl: value } : item)),
                      },
                    })
                  }
                />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={concert.soldOut}
                    onChange={(event) =>
                      update({
                        ...content,
                        concerts: {
                          ...content.concerts,
                          items: content.concerts.items.map((item) =>
                            item.id === concert.id ? { ...item, soldOut: event.target.checked } : item,
                          ),
                        },
                      })
                    }
                  />
                  Concert complet
                </label>
              </div>
            ))}
          </Section>

          <Section title="Groupe">
            <Input label="Label" value={content.group.label} onChange={(value) => update({ ...content, group: { ...content.group, label: value } })} />
            <Input label="Titre" value={content.group.title} onChange={(value) => update({ ...content, group: { ...content.group, title: value } })} />
            {content.group.members.map((member) => (
              <div key={member.id} className="space-y-2 rounded-md border border-white/10 p-3">
                <Input
                  label="Nom"
                  value={member.name}
                  onChange={(value) =>
                    update({
                      ...content,
                      group: {
                        ...content.group,
                        members: content.group.members.map((item) => (item.id === member.id ? { ...item, name: value } : item)),
                      },
                    })
                  }
                />
                <Textarea
                  label="Texte"
                  value={member.roleText}
                  onChange={(value) =>
                    update({
                      ...content,
                      group: {
                        ...content.group,
                        members: content.group.members.map((item) =>
                          item.id === member.id ? { ...item, roleText: value } : item,
                        ),
                      },
                    })
                  }
                />
                <ImageInput
                  label="Photo membre"
                  value={member.imageUrl}
                  onChange={(value) =>
                    update({
                      ...content,
                      group: {
                        ...content.group,
                        members: content.group.members.map((item) =>
                          item.id === member.id ? { ...item, imageUrl: value } : item,
                        ),
                      },
                    })
                  }
                />
              </div>
            ))}
          </Section>

          <Section title="Instagram et footer">
            <Input label="Titre insta" value={content.insta.title} onChange={(value) => update({ ...content, insta: { ...content.insta, title: value } })} />
            <Input label="Handle" value={content.insta.handle} onChange={(value) => update({ ...content, insta: { ...content.insta, handle: value } })} />
            {content.insta.items.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 p-3">
                <ImageInput
                  label={`Image ${item.id}`}
                  value={item.imageUrl}
                  onChange={(value) =>
                    update({
                      ...content,
                      insta: {
                        ...content.insta,
                        items: content.insta.items.map((entry) => (entry.id === item.id ? { ...entry, imageUrl: value } : entry)),
                      },
                    })
                  }
                />
              </div>
            ))}
            <Input
              label="Email de contact"
              type="email"
              value={content.footer.contactEmail}
              onChange={(value) => update({ ...content, footer: { ...content.footer, contactEmail: value } })}
            />
            <Input
              label="Copyright"
              value={content.footer.copyright}
              onChange={(value) => update({ ...content, footer: { ...content.footer, copyright: value } })}
            />
            <Input
              label="URL Instagram"
              value={content.social.instagramUrl}
              onChange={(value) => update({ ...content, social: { ...content.social, instagramUrl: value } })}
            />
            <Input
              label="URL Spotify"
              value={content.social.spotifyUrl}
              onChange={(value) => update({ ...content, social: { ...content.social, spotifyUrl: value } })}
            />
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-2 font-semibold">Aperçu rapide</h2>
            <p className="text-sm text-white/70">Titre SEO: {content.seo.title}</p>
            <p className="text-sm text-white/70">Groupe: {content.hero.bandName}</p>
            <p className="text-sm text-white/70">Clips: {clipCount}</p>
            <p className="text-sm text-white/70">Concerts: {content.concerts.items.length}</p>
            <p className="text-sm text-white/70">Membres: {content.group.members.length}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-2 font-semibold">Statut</h2>
            {githubSha ? <p className="text-xs break-all text-white/70">SHA: {githubSha}</p> : <p className="text-xs text-white/60">Mode local sans GitHub API.</p>}
            {notice ? <p className="mt-2 text-sm text-emerald-300">{notice}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
