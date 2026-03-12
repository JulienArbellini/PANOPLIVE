import fs from "node:fs/promises";
import path from "node:path";
import siteJson from "../../content/site.json";
import type { SiteContent } from "@/types/content";

const localContentPath = path.join(process.cwd(), "content", "site.json");

export function getStaticSiteContent(): SiteContent {
  return siteJson as SiteContent;
}

export async function writeLocalSiteContent(content: SiteContent): Promise<void> {
  await fs.writeFile(localContentPath, `${JSON.stringify(content, null, 2)}\n`, "utf-8");
}
