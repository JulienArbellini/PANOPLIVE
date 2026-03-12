import type { SiteContent } from "@/types/content";
import { InteractiveEffects } from "@/components/site/interactive-effects";

export function SitePageContent({ content }: { content: SiteContent }) {
  return (
    <div>
      <InteractiveEffects backgroundImageUrl={content.backgroundImageUrl} />

      <nav className="fixed top-0 z-[1000] flex w-full items-center justify-between p-6 mix-blend-difference md:p-10">
        <div className="cinzel text-xl font-bold tracking-widest text-cyan-400 md:text-2xl">{content.navigation.logo}</div>
        <div className="flex gap-4 text-[8px] font-light tracking-[0.2em] uppercase md:gap-10 md:text-[10px] md:tracking-[0.5em]">
          {content.navigation.links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-cyan-400 transition">
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="intro" className="flex min-h-screen flex-col items-center justify-center px-6 pt-32 text-center">
        <div className="reveal-text active">
          <p className="mantra text-xs md:text-sm">{content.hero.mantra}</p>
          <h1 className="cinzel reflect-box text-[15vw] leading-none tracking-tighter md:text-[10vw]" data-text={content.hero.bandName}>
            {content.hero.bandName}
          </h1>
          <div className="mx-auto mt-8 max-w-xl space-y-6 md:mt-12">
            <p className="serif text-xl italic opacity-60 md:text-3xl">{content.hero.subtitle}</p>
            <div className="mx-auto h-px w-24 bg-cyan-400/20 md:w-32" />
            <p className="text-[8px] leading-relaxed font-light tracking-[0.5em] opacity-40 uppercase md:text-[10px] md:tracking-[0.8em]">
              {content.hero.kicker}
            </p>
          </div>
        </div>

        <div className="drifting mt-24 opacity-20 md:mt-32">
          <img src={content.hero.mirrorImageUrl} className="mix-blend-screen w-32 md:w-48" alt="Miroir" />
        </div>
      </section>

      <section id="album" className="container relative mx-auto grid gap-12 px-6 py-32 md:py-64 lg:grid-cols-12 lg:items-center">
        <div className="relative lg:col-span-5">
          <div className="film-strip drifting aspect-square" style={{ animationDelay: "-2s" }}>
            <img src={content.album.coverImageUrl} alt="Pochette de l'album" style={{ filter: "none" }} />
          </div>
        </div>
        <div className="space-y-8 lg:col-span-7 lg:pl-24">
          <div className="reveal-text">
            <p className="mb-4 text-[9px] tracking-[0.5em] text-cyan-400 uppercase">{content.album.label}</p>
            <h2 className="cinzel mb-6 text-4xl md:text-7xl">{content.album.title}</h2>
            <p className="mb-10 max-w-lg text-lg opacity-60">{content.album.description}</p>
            <a
              href={content.album.ctaUrl}
              className="inline-block border border-white/20 px-8 py-3 text-[10px] tracking-[0.4em] uppercase hover:bg-white hover:text-black transition-all"
            >
              {content.album.ctaLabel}
            </a>
          </div>
        </div>
      </section>

      <section id="clips" className="relative bg-black/40 py-32 md:py-64">
        <div className="container mx-auto px-6">
          <div className="mb-20 text-center">
            <p className="mb-4 text-[9px] tracking-[0.8em] text-cyan-400 uppercase">{content.clips.label}</p>
            <h3 className="cinzel text-4xl uppercase md:text-6xl">{content.clips.title}</h3>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {content.clips.items.map((clip) => (
              <a key={clip.id} href={clip.videoUrl} className="video-container group block">
                <div className="relative aspect-video overflow-hidden bg-zinc-900">
                  <img
                    src={clip.imageUrl}
                    className="h-full w-full object-cover opacity-50 transition-transform duration-1000 group-hover:scale-110"
                    alt={clip.title}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400 transition-all group-hover:bg-cyan-400/20">
                      <div className="ml-1 h-0 w-0 border-t-[8px] border-b-[8px] border-l-[12px] border-t-transparent border-b-transparent border-l-cyan-400" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="serif text-2xl italic">{clip.title}</h4>
                  <p className="mt-2 text-[9px] tracking-widest opacity-40 uppercase">{clip.caption}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="concerts" className="relative py-32 md:py-64">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="mb-20 text-left">
            <p className="mb-4 text-[9px] tracking-[0.8em] text-cyan-400 uppercase">{content.concerts.label}</p>
            <h3 className="cinzel text-4xl md:text-6xl">{content.concerts.title}</h3>
          </div>

          <div>
            {content.concerts.items.map((concert) => (
              <div key={concert.id} className="concert-row group flex flex-col justify-between gap-6 py-8 md:flex-row md:items-center md:py-12">
                <div className="flex items-center gap-8">
                  <span className="cinzel text-cyan-400/40 transition-colors group-hover:text-cyan-400">{concert.dateDisplay}</span>
                  <div>
                    <h4 className="serif text-2xl md:text-3xl">{concert.venue}</h4>
                    <p className="text-[10px] tracking-widest opacity-40 uppercase">{concert.city}</p>
                  </div>
                </div>
                {concert.soldOut ? (
                  <span className="border border-transparent px-6 py-3 text-center text-[9px] tracking-[0.4em] opacity-20 uppercase">
                    {concert.ctaLabel}
                  </span>
                ) : (
                  <a
                    href={concert.ctaUrl}
                    className="border border-white/10 px-6 py-3 text-center text-[9px] tracking-[0.4em] uppercase hover:border-cyan-400 transition-all"
                  >
                    {concert.ctaLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="groupe" className="relative bg-black/20 py-32 md:py-64">
        <div className="container mx-auto mb-20 px-6 text-center">
          <p className="mb-4 text-[9px] tracking-[1em] opacity-30 uppercase">{content.group.label}</p>
          <h3 className="cinzel text-4xl md:text-6xl">{content.group.title}</h3>
        </div>
        <div className="group-container reveal-text">
          {content.group.members.map((member) => (
            <div key={member.id} className="member-card">
              <div className="film-strip">
                <div className="member-info">
                  <h4 className="cinzel text-xl tracking-widest text-cyan-400">{member.name}</h4>
                  <p className="serif max-w-[250px] text-sm leading-relaxed italic opacity-80">{member.roleText}</p>
                </div>
                <img src={member.imageUrl} alt={member.name} />
              </div>
              <div className="member-name-label cinzel text-[10px] tracking-[0.3em] md:text-sm">{member.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="insta" className="container mx-auto px-6 py-32">
        <div className="mb-16">
          <h3 className="serif text-3xl italic md:text-4xl">{content.insta.title}</h3>
          <p className="mt-2 text-[9px] tracking-[0.5em] opacity-30 uppercase">{content.insta.handle}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {content.insta.items.map((item) => (
            <div key={item.id} className="group aspect-square overflow-hidden bg-white/5">
              <img
                src={item.imageUrl}
                className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
                alt={item.alt}
              />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-20 text-center">
        <div className="cinzel mb-8 text-2xl text-cyan-400">{content.navigation.logo}</div>
        <div className="mb-12 flex justify-center gap-8">
          <a href={`mailto:${content.footer.contactEmail}`} className="serif text-xl italic opacity-40 hover:opacity-100 transition">
            Email
          </a>
          <a href={content.social.instagramUrl} className="serif text-xl italic opacity-40 hover:opacity-100 transition">
            Instagram
          </a>
          <a href={content.social.spotifyUrl} className="serif text-xl italic opacity-40 hover:opacity-100 transition">
            Spotify
          </a>
        </div>
        <p className="text-[7px] tracking-[1em] opacity-20 uppercase">{content.footer.copyright}</p>
      </footer>
    </div>
  );
}
