function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAuthEnv() {
  return {
    adminEmail: required("ADMIN_EMAIL"),
    adminPasswordHash: required("ADMIN_PASSWORD_HASH"),
    sessionSecret: required("SESSION_SECRET"),
  };
}

export function getGithubEnv() {
  return {
    owner: required("GITHUB_OWNER"),
    repo: required("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH || "main",
    token: required("GITHUB_TOKEN"),
    contentPath: process.env.GITHUB_CONTENT_PATH || "content/site.json",
  };
}

export function hasGithubEnv() {
  return Boolean(
    process.env.GITHUB_OWNER && process.env.GITHUB_REPO && process.env.GITHUB_TOKEN,
  );
}

export function getCloudinaryEnv() {
  return {
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
  };
}
