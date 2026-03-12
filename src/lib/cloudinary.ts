import crypto from "node:crypto";
import { getCloudinaryEnv } from "@/lib/env";

export function createCloudinarySignature(timestamp: number) {
  const { apiSecret, apiKey, cloudName } = getCloudinaryEnv();
  const payload = `timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(payload).digest("hex");

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
  };
}
