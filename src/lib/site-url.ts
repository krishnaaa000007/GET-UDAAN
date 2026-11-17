/**
 * The site's public address, without a trailing slash.
 *  1. APP_URL if set (your PC, or your own domain once bought).
 *  2. On Vercel: the project's production address (e.g. https://getudaan.vercel.app), which Vercel provides itself.
 *  3. Otherwise http://localhost:3000.
 * Used for login links, payment callbacks, emails and share links, so it must never be "localhost" on the live site.
 */
export function siteUrl(): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
