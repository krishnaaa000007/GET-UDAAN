/** Creates/updates tables in the separate test database (works in PowerShell, CMD and bash). */
import { execSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/reelbhai_test";
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
console.log("✅ Test database ready");
