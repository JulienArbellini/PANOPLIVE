import type { SiteContent } from "@/types/content";
import { getGithubEnv } from "@/lib/env";

type GithubContentResponse = {
  sha: string;
  content: string;
};

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getGithubSiteContent(): Promise<{ content: SiteContent; sha: string }> {
  const env = getGithubEnv();

  const url = `https://api.github.com/repos/${env.owner}/${env.repo}/contents/${env.contentPath}?ref=${env.branch}`;
  const response = await fetch(url, { headers: headers(env.token), cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub read failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as GithubContentResponse;
  const decoded = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    content: JSON.parse(decoded) as SiteContent,
    sha: data.sha,
  };
}

export async function commitGithubSiteContent(args: {
  content: SiteContent;
  sha: string;
  authorEmail: string;
}) {
  const env = getGithubEnv();
  const url = `https://api.github.com/repos/${env.owner}/${env.repo}/contents/${env.contentPath}`;

  const message = `content: update site data (${new Date().toISOString()})`;
  const encodedContent = Buffer.from(`${JSON.stringify(args.content, null, 2)}\n`, "utf-8").toString(
    "base64",
  );

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers(env.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      sha: args.sha,
      branch: env.branch,
      committer: {
        name: "Panoplive Admin",
        email: args.authorEmail,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub publish failed (${response.status}): ${body}`);
  }

  return response.json();
}
