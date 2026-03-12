export type SeoConfig = {
  title: string;
  description: string;
};

export type HeroSection = {
  mantra: string;
  bandName: string;
  subtitle: string;
  kicker: string;
  mirrorImageUrl: string;
};

export type AlbumSection = {
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  coverImageUrl: string;
};

export type ClipItem = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  videoUrl: string;
};

export type ConcertItem = {
  id: string;
  dateDisplay: string;
  venue: string;
  city: string;
  ctaLabel: string;
  ctaUrl: string;
  soldOut: boolean;
};

export type MemberItem = {
  id: string;
  name: string;
  roleText: string;
  imageUrl: string;
};

export type InstaItem = {
  id: string;
  imageUrl: string;
  alt: string;
};

export type SocialLinks = {
  instagramUrl: string;
  spotifyUrl: string;
};

export type SiteContent = {
  seo: SeoConfig;
  navigation: {
    logo: string;
    links: Array<{ label: string; href: string }>;
  };
  backgroundImageUrl: string;
  hero: HeroSection;
  album: AlbumSection;
  clips: {
    label: string;
    title: string;
    items: ClipItem[];
  };
  concerts: {
    label: string;
    title: string;
    items: ConcertItem[];
  };
  group: {
    label: string;
    title: string;
    members: MemberItem[];
  };
  insta: {
    title: string;
    handle: string;
    items: InstaItem[];
  };
  footer: {
    copyright: string;
    contactEmail: string;
  };
  social: SocialLinks;
};
