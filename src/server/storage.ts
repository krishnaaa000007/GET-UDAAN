/**
 * Private files (PDFs, prompt packs, templates).
 *  - Production: Cloudflare R2, served via 10-minute signed URLs.
 *  - Dev: files in ./storage, served by /api/files after the same access check.
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { hmac } from "@/lib/crypto";

const SIGNED_TTL_SEC = 10 * 60;

export async function signedDownloadUrl(storageKey: string, filename: string): Promise<string> {
  if (env.r2.configured) {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
    });
    return getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: env.r2.bucket, Key: storageKey, ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"` }),
      { expiresIn: SIGNED_TTL_SEC },
    );
  }
  // Dev: our own short-lived signature
  const exp = Math.floor(Date.now() / 1000) + SIGNED_TTL_SEC;
  const sig = hmac(`file:${storageKey}:${exp}`).slice(0, 32);
  return `/api/files?key=${encodeURIComponent(storageKey)}&exp=${exp}&sig=${sig}&name=${encodeURIComponent(filename)}`;
}

export function verifyDevFileSignature(key: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return hmac(`file:${key}:${exp}`).slice(0, 32) === sig;
}

export async function readDevFile(key: string): Promise<Buffer | null> {
  const root = path.resolve(process.cwd(), "storage");
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) return null; // no ../ tricks
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}
