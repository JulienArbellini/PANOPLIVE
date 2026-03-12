import type { Metadata } from "next";
import { SitePageContent } from "@/components/site/page-content";
import { getLatestSocialPosts } from "@/lib/social-feed";
import { getStaticSiteContent } from "@/lib/site-content";

export const revalidate = 1800;

export function generateMetadata(): Metadata {
  const content = getStaticSiteContent();
  return {
    title: content.seo.title,
    description: content.seo.description,
    openGraph: {
      title: content.seo.title,
      description: content.seo.description,
      type: "website",
      locale: "fr_FR",
    },
  };
}

export default async function HomePage() {
  const content = getStaticSiteContent();
  const latestPosts = await getLatestSocialPosts();

  return <SitePageContent content={content} latestPosts={latestPosts} />;
}
