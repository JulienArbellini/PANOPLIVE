import type { SocialPost } from "@/types/social";

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTagValue(source: string, tagName: string): string | null {
  const match = source.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  return match?.[1]?.trim() ?? null;
}

async function fetchLatestYouTube(channelId: string): Promise<SocialPost[]> {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`YouTube feed unavailable (${response.status})`);
  }

  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);

  return entries.reduce<SocialPost[]>((acc, entry) => {
      const videoId = extractTagValue(entry, "yt:videoId");
      const title = extractTagValue(entry, "title");
      const published = extractTagValue(entry, "published");

      if (!videoId || !title || !published) return acc;

      acc.push({
        id: `yt-${videoId}`,
        network: "youtube" as const,
        title: decodeXmlEntities(title),
        imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: published,
      });

      return acc;
    }, []);
}

type YouTubeChannelsResponse = {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type YouTubePlaylistItemsResponse = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
      thumbnails?: {
        maxres?: { url?: string };
        standard?: { url?: string };
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

type YouTubeThumbSet = {
  maxres?: { url?: string };
  standard?: { url?: string };
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
};

function getBestThumb(thumbnails?: YouTubeThumbSet): string | null {
  if (!thumbnails) return null;
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  );
}

async function fetchLatestYouTubeViaApi(channelId: string, apiKey: string, limit: number): Promise<SocialPost[]> {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`,
    { next: { revalidate: 1800 } },
  );

  if (!channelRes.ok) {
    throw new Error(`YouTube channels API unavailable (${channelRes.status})`);
  }

  const channelJson = (await channelRes.json()) as YouTubeChannelsResponse;
  const uploadsPlaylistId = channelJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    return [];
  }

  const posts: SocialPost[] = [];
  let nextPageToken: string | undefined;

  while (posts.length < limit) {
    const maxResults = Math.min(50, limit - posts.length);
    const pagePart = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : "";
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=${maxResults}&key=${encodeURIComponent(apiKey)}${pagePart}`,
      { next: { revalidate: 1800 } },
    );

    if (!playlistRes.ok) {
      throw new Error(`YouTube playlistItems API unavailable (${playlistRes.status})`);
    }

    const playlistJson = (await playlistRes.json()) as YouTubePlaylistItemsResponse;
    const items = playlistJson.items ?? [];

    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      const title = snippet?.title;
      const publishedAt = snippet?.publishedAt;
      const thumb = getBestThumb(snippet?.thumbnails);

      if (!videoId || !title || !publishedAt || !thumb) continue;

      posts.push({
        id: `yt-${videoId}`,
        network: "youtube",
        title,
        imageUrl: thumb,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt,
      });
    }

    nextPageToken = playlistJson.nextPageToken;
    if (!nextPageToken || items.length === 0) break;
  }

  return posts.slice(0, limit);
}

type InstagramResponse = {
  data?: Array<{
    id: string;
    caption?: string;
    media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
  }>;
};

async function fetchLatestInstagram(accessToken: string): Promise<SocialPost[]> {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`,
    { next: { revalidate: 1800 } },
  );

  if (!response.ok) {
    throw new Error(`Instagram feed unavailable (${response.status})`);
  }

  const json = (await response.json()) as InstagramResponse;
  const items = json.data ?? [];

  return items.reduce<SocialPost[]>((acc, item) => {
      const imageUrl = item.thumbnail_url || item.media_url;
      if (!item.id || !item.permalink || !item.timestamp || !imageUrl) return acc;

      acc.push({
        id: `ig-${item.id}`,
        network: "instagram" as const,
        title: item.caption?.slice(0, 120) || "Publication Instagram",
        imageUrl,
        url: item.permalink,
        publishedAt: item.timestamp,
      });

      return acc;
    }, []);
}

export async function getLatestSocialPosts(): Promise<SocialPost[]> {
  const feeds: SocialPost[][] = [];

  const youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim();
  const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const limit = Number(process.env.SOCIAL_POSTS_LIMIT || "6");
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 6;

  if (youtubeChannelId) {
    try {
      if (youtubeApiKey) {
        feeds.push(await fetchLatestYouTubeViaApi(youtubeChannelId, youtubeApiKey, normalizedLimit));
      } else {
        feeds.push(await fetchLatestYouTube(youtubeChannelId));
      }
    } catch {
      // Ignore provider failure and keep other feeds available.
    }
  }

  if (instagramAccessToken) {
    try {
      feeds.push(await fetchLatestInstagram(instagramAccessToken));
    } catch {
      // Ignore provider failure and keep other feeds available.
    }
  }

  return feeds
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, normalizedLimit);
}
