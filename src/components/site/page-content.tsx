import type { ReactNode } from "react";
import type { SiteContent } from "@/types/content";
import type { SocialPost } from "@/types/social";
import { InteractiveEffects } from "@/components/site/interactive-effects";

type SitePageContentProps = {
  content: SiteContent;
  latestPosts?: SocialPost[];
  showEffects?: boolean;
  editMode?: boolean;
  onEditField?: (fieldId: string) => void;
};

function EditableNode({
  editMode,
  fieldId,
  onEdit,
  children,
}: {
  editMode: boolean;
  fieldId: string;
  onEdit?: (fieldId: string) => void;
  children: ReactNode;
}) {
  if (!editMode) {
    return <>{children}</>;
  }

  return (
    <div className="group/edit relative">
      <div className="pointer-events-none absolute inset-0 z-20 rounded-sm border border-dashed border-cyan-300/0 transition group-hover/edit:border-cyan-300/55" />
      {onEdit ? (
        <button
          type="button"
          className="absolute -top-3 right-0 z-30 rounded-sm border border-cyan-300/50 bg-slate-950/90 px-2 py-1 text-[10px] font-semibold tracking-[0.15em] text-cyan-200 uppercase opacity-0 transition group-hover/edit:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit(fieldId);
          }}
        >
          Modifier
        </button>
      ) : null}
      {children}
    </div>
  );
}

function extractYouTubeId(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const path = url.pathname;

      if (path === "/watch") {
        const id = url.searchParams.get("v");
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }

      const chunks = path.split("/").filter(Boolean);
      const marker = chunks[0];
      const id = chunks[1];

      if ((marker === "embed" || marker === "shorts" || marker === "live") && id) {
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const id = extractYouTubeId(rawUrl);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

const DEFAULT_PORTAL_NARRATIVE = [
  "Panoplie vous invite a entamer une odyssee mentale pop et psychedelique, une traversee du miroir a la recherche d'un reflet perdu.",
  "Ce voyage narratif en plusieurs chapitres explore des inconscients vaporeux, ou les identites se fragmentent, flottant entre reve et realite.",
  "Un voyage pour ceux qui n'ont pas peur de se perdre, au coeur d'eux-memes, ou quelque part de l'autre cote du miroir.",
];

const INTRO_SHARDS = [
  { key: "tl", className: "portal-shard-tl", rotate: -18, scale: 0.86 },
  { key: "tr", className: "portal-shard-tr", rotate: 24, scale: 0.74 },
  { key: "ml", className: "portal-shard-ml", rotate: -36, scale: 0.7 },
  { key: "mr", className: "portal-shard-mr", rotate: 30, scale: 0.66 },
  { key: "bl", className: "portal-shard-bl", rotate: -12, scale: 0.82 },
  { key: "br", className: "portal-shard-br", rotate: 20, scale: 0.8 },
];

export function SitePageContent({
  content,
  latestPosts = [],
  showEffects = true,
  editMode = false,
  onEditField,
}: SitePageContentProps) {
  const autoSocialPosts = !editMode ? latestPosts : [];
  const introPrompt =
    content.hero.mantra?.trim() || "Il parait qu'il existe un passage pour traverser nos miroirs...";
  const narrativeParts = content.album.description
    .split(/\r?\n\s*\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const narrativeParagraphs = [
    narrativeParts[0] || DEFAULT_PORTAL_NARRATIVE[0],
    narrativeParts[1] || DEFAULT_PORTAL_NARRATIVE[1],
    narrativeParts[2] || DEFAULT_PORTAL_NARRATIVE[2],
  ];
  const linkBehavior = editMode
    ? {
        onClick: (event: React.MouseEvent) => {
          event.preventDefault();
        },
      }
    : {};

  return (
    <div>
      {showEffects ? (
        <InteractiveEffects backgroundImageUrl={content.backgroundImageUrl} />
      ) : (
        <div className="void-image-bg" style={{ backgroundImage: `url(${content.backgroundImageUrl})` }} />
      )}

      <nav className="fixed top-0 z-[1000] flex w-full items-center justify-between p-6 mix-blend-difference md:p-10">
        <EditableNode editMode={editMode} fieldId="navigation.logo" onEdit={onEditField}>
          <div className="cinzel text-xl font-bold tracking-widest text-cyan-400 md:text-2xl">{content.navigation.logo}</div>
        </EditableNode>
        <div className="flex gap-4 text-[8px] font-light tracking-[0.2em] uppercase md:gap-10 md:text-[10px] md:tracking-[0.5em]">
          {content.navigation.links.map((link, index) => (
            <EditableNode
              key={link.href}
              editMode={editMode}
              fieldId={`navigation.links.${index}.label`}
              onEdit={onEditField}
            >
              <a href={link.href} className="hover:text-cyan-400 transition" {...linkBehavior}>
                {link.label}
              </a>
            </EditableNode>
          ))}
        </div>
      </nav>

      <section id="intro" className="portal-intro relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-28 text-center md:pt-36">
        <div className="portal-deco-layer" aria-hidden>
          {INTRO_SHARDS.map((shard, index) => (
            <img
              key={shard.key}
              src={content.hero.mirrorImageUrl}
              alt=""
              className={`portal-shard ${shard.className}`}
              style={{
                transform: `rotate(${shard.rotate}deg) scale(${shard.scale})`,
                animationDelay: `${index * -1.6}s`,
              }}
            />
          ))}
        </div>

        <div className="portal-intro-content reveal-text active">
          <EditableNode editMode={editMode} fieldId="hero.mantra" onEdit={onEditField}>
            <p className="portal-intro-quote serif">{introPrompt}</p>
          </EditableNode>

          <EditableNode editMode={editMode} fieldId="hero.mirrorImageUrl" onEdit={onEditField}>
            <a
              href="#album"
              aria-label="Traverser vers la suite"
              className="portal-mirror-link drifting"
              {...linkBehavior}
            >
              <img src={content.hero.mirrorImageUrl} className="portal-mirror-fragment" alt="Fragment de miroir" />
            </a>
          </EditableNode>
        </div>
      </section>

      <section id="album" className="portal-story-section relative px-6 py-24 md:py-40">
        <div className="portal-story container mx-auto max-w-4xl space-y-10 md:space-y-16">
          <EditableNode editMode={editMode} fieldId="album.description" onEdit={onEditField}>
            <p className="portal-story-paragraph serif">{narrativeParagraphs[0]}</p>
          </EditableNode>

          <EditableNode editMode={editMode} fieldId="album.coverImageUrl" onEdit={onEditField}>
            <div className="portal-story-image-wrap">
              <img
                src={content.album.coverImageUrl}
                alt={content.album.title || "Vision du voyage"}
                className="portal-story-image"
              />
            </div>
          </EditableNode>

          <EditableNode editMode={editMode} fieldId="album.description" onEdit={onEditField}>
            <p className="portal-story-paragraph serif">{narrativeParagraphs[1]}</p>
          </EditableNode>

          <EditableNode editMode={editMode} fieldId="album.description" onEdit={onEditField}>
            <p className="portal-story-paragraph serif">{narrativeParagraphs[2]}</p>
          </EditableNode>
        </div>
      </section>

      <section id="clips" className="relative bg-black/40 py-32 md:py-64">
        <div className="container mx-auto px-6">
          <EditableNode editMode={editMode} fieldId="clips.title" onEdit={onEditField}>
            <h3 className="cinzel mb-20 text-center text-4xl uppercase md:text-6xl">{content.clips.title}</h3>
          </EditableNode>

          <div className="grid gap-8 md:grid-cols-2">
            {content.clips.items.map((clip) => (
              <div key={clip.id} className="video-container group block">
                <EditableNode editMode={editMode} fieldId={`clips.items.${clip.id}.videoUrl`} onEdit={onEditField}>
                  <div className="relative aspect-video overflow-hidden bg-zinc-900">
                    {(() => {
                      const embedUrl = getYouTubeEmbedUrl(clip.videoUrl) ?? getYouTubeEmbedUrl(clip.imageUrl);
                      if (embedUrl) {
                        return (
                          <iframe
                            title={clip.title}
                            name={`clip-frame-${clip.id}`}
                            src={`${embedUrl}?rel=0&modestbranding=1`}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            suppressHydrationWarning
                          />
                        );
                      }

                      return (
                        <img
                          src={clip.imageUrl}
                          className="h-full w-full object-cover opacity-50 transition-transform duration-1000 group-hover:scale-110"
                          alt={clip.title}
                        />
                      );
                    })()}
                  </div>
                </EditableNode>

                <div className="p-6">
                  <EditableNode editMode={editMode} fieldId={`clips.items.${clip.id}.title`} onEdit={onEditField}>
                    <h4 className="serif text-2xl italic">{clip.title}</h4>
                  </EditableNode>
                  <EditableNode editMode={editMode} fieldId={`clips.items.${clip.id}.caption`} onEdit={onEditField}>
                    <p className="mt-2 text-[9px] tracking-widest opacity-40 uppercase">{clip.caption}</p>
                  </EditableNode>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="concerts" className="relative py-32 md:py-64">
        <div className="container mx-auto max-w-4xl px-6">
          <EditableNode editMode={editMode} fieldId="concerts.title" onEdit={onEditField}>
            <h3 className="cinzel mb-20 text-4xl md:text-6xl">{content.concerts.title}</h3>
          </EditableNode>

          <div>
            {content.concerts.items.map((concert) => (
              <div key={concert.id} className="concert-row group flex flex-col justify-between gap-6 py-8 md:flex-row md:items-center md:py-12">
                <div className="flex items-center gap-8">
                  <EditableNode editMode={editMode} fieldId={`concerts.items.${concert.id}.dateDisplay`} onEdit={onEditField}>
                    <span className="cinzel text-cyan-400/40 transition-colors group-hover:text-cyan-400">{concert.dateDisplay}</span>
                  </EditableNode>
                  <div>
                    <EditableNode editMode={editMode} fieldId={`concerts.items.${concert.id}.venue`} onEdit={onEditField}>
                      <h4 className="serif text-2xl md:text-3xl">{concert.venue}</h4>
                    </EditableNode>
                    <EditableNode editMode={editMode} fieldId={`concerts.items.${concert.id}.city`} onEdit={onEditField}>
                      <p className="text-[10px] tracking-widest opacity-40 uppercase">{concert.city}</p>
                    </EditableNode>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="groupe" className="relative bg-black/20 py-32 md:py-64">
        <div className="container mx-auto mb-20 px-6 text-center">
          <EditableNode editMode={editMode} fieldId="group.title" onEdit={onEditField}>
            <h3 className="cinzel text-4xl md:text-6xl">{content.group.title}</h3>
          </EditableNode>
        </div>
        <div className="group-container reveal-text">
          {content.group.members.map((member, index) => (
            <div
              key={member.id}
              className={`member-card ${
                index === 0
                  ? "md:mt-12"
                  : index === 1
                    ? "md:mt-24"
                    : index === 3
                      ? "md:mt-16"
                      : index === 4
                        ? "md:mt-8"
                        : ""
              }`}
            >
              <EditableNode editMode={editMode} fieldId={`group.members.${member.id}.imageUrl`} onEdit={onEditField}>
                <div className="film-strip">
                  <div className="member-info">
                    <EditableNode editMode={editMode} fieldId={`group.members.${member.id}.name`} onEdit={onEditField}>
                      <h4 className="cinzel text-xl tracking-widest text-cyan-400">{member.name}</h4>
                    </EditableNode>
                    <EditableNode editMode={editMode} fieldId={`group.members.${member.id}.roleText`} onEdit={onEditField}>
                      <p className="serif max-w-[250px] text-sm leading-relaxed italic opacity-80">{member.roleText}</p>
                    </EditableNode>
                  </div>
                  <img src={member.imageUrl} alt={member.name} />
                </div>
              </EditableNode>
              <div className="member-name-label cinzel text-[10px] tracking-[0.3em] md:text-sm">{member.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="insta" className="container mx-auto px-6 py-32">
        <EditableNode editMode={editMode} fieldId="insta.title" onEdit={onEditField}>
          <h3 className="serif mb-4 text-3xl italic md:text-4xl">{content.insta.title}</h3>
        </EditableNode>
        {autoSocialPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {autoSocialPosts.map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-md border border-white/10 bg-black/20 transition hover:border-cyan-400/60"
              >
                <div className="aspect-video overflow-hidden bg-black/40">
                  <img
                    src={post.imageUrl}
                    className="h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                    alt={post.title}
                  />
                </div>
                <div className="space-y-2 p-4">
                  <div className="text-[10px] tracking-[0.3em] text-cyan-300 uppercase">{post.network}</div>
                  <p className="line-clamp-2 text-sm text-white/85">{post.title}</p>
                  <p className="text-[10px] tracking-[0.2em] text-white/45 uppercase">
                    {new Date(post.publishedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {content.insta.items.map((item) => (
              <EditableNode key={item.id} editMode={editMode} fieldId={`insta.items.${item.id}.imageUrl`} onEdit={onEditField}>
                <div className="group aspect-square overflow-hidden bg-white/5">
                  <img
                    src={item.imageUrl}
                    className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
                    alt={item.alt}
                  />
                </div>
              </EditableNode>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 py-20 text-center">
        <EditableNode editMode={editMode} fieldId="footer.contactEmail" onEdit={onEditField}>
          <a href={`mailto:${content.footer.contactEmail}`} className="serif text-xl italic opacity-40 hover:opacity-100 transition" {...linkBehavior}>
            Email
          </a>
        </EditableNode>
        <p className="mt-4 text-[7px] tracking-[1em] opacity-20 uppercase">{content.footer.copyright}</p>
      </footer>
    </div>
  );
}
