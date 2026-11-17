/**
 * Which database address to use.
 *  - Our own names first (DATABASE_URL / DIRECT_URL, used on your PC and in .env.example).
 *  - Otherwise the names the Supabase ↔ Vercel integration adds automatically (POSTGRES_*).
 *
 * Supabase URLs end in `sslmode=require`. The node-postgres driver treats that as "verify the
 * certificate against public CAs", which Supabase's pooler certificate does not pass. Adding
 * `uselibpqcompat=true` gives `require` its standard Postgres meaning: always encrypted.
 * Plain JS (no TypeScript-only syntax) so prisma.config.ts can import it too.
 */
export function withSslCompat(url: string): string {
  if (!/[?&]sslmode=require\b/.test(url) || /[?&]uselibpqcompat=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}uselibpqcompat=true`;
}

/** Pooled connection for the running app (many short requests). */
export function appDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url ? withSslCompat(url) : undefined;
}

/** Direct connection for migrations (Supabase: port 5432, not the 6543 pooler). */
export function directDatabaseUrl(): string | undefined {
  return process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || undefined;
}
