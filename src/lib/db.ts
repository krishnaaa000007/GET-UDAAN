/**
 * Single shared Prisma client (Prisma 7 + node-postgres driver adapter).
 * In dev, Next.js hot-reload would otherwise create a new pool on every edit.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { appDatabaseUrl } from "@/lib/db-url";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function create() {
  const connectionString = appDatabaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL (or Supabase POSTGRES_URL) is not set — see .env.example");
  // Serverless: keep the pool tiny; Supabase's pooler does the real pooling.
  const adapter = new PrismaPg({ connectionString, max: process.env.VERCEL ? 1 : 5 });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.__prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = db;

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
