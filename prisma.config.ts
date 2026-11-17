// Prisma 7 configuration: where the schema/migrations live and how to reach the DB.
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { directDatabaseUrl } from "./src/lib/db-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a DIRECT connection (Supabase: port 5432, not the 6543 pooler).
    // DIRECT_URL locally; POSTGRES_URL_NON_POOLING when the Supabase ↔ Vercel integration set the keys.
    url: directDatabaseUrl() ?? "",
  },
});
