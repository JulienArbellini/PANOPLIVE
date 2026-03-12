export type SocialNetwork = "youtube" | "instagram";

export type SocialPost = {
  id: string;
  network: SocialNetwork;
  title: string;
  imageUrl: string;
  url: string;
  publishedAt: string;
};
