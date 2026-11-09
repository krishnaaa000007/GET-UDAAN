// Prisma 7 configuration: where the schema/migrations live and how to reach the DB.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a DIRECT connection (Supabase: port 5432, not the 6543 pooler).
    url: env("DIRECT_URL"),
  },
});
