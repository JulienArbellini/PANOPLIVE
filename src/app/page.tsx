import type { Metadata } from "next";
import { SitePageContent } from "@/components/site/page-content";
import { getStaticSiteContent } from "@/lib/site-content";

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

export default function HomePage() {
  const content = getStaticSiteContent();
  return <SitePageContent content={content} />;
}
