/**
 * Local development database — a real PostgreSQL that runs from node_modules.
 * No Docker or Supabase account needed while developing.
 *
 *   npm run db:start   (keep this terminal open)
 *
 * Data is kept in ./.local-db between runs. Delete that folder to start fresh.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.cwd(), ".local-db");
const port = Number(process.env.LOCAL_DB_PORT ?? 54329);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
  });

  const fresh = !fs.existsSync(path.join(dir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) {
    await pg.createDatabase("reelbhai");
    await pg.createDatabase("reelbhai_test");
  }
  console.log(`\n✅ Local Postgres running on port ${port} (databases: reelbhai, reelbhai_test)`);
  console.log("   Press Ctrl+C to stop.\n");

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
