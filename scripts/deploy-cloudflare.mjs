import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const configPath = "dist/server/wrangler.json";
const migrationsSource = "drizzle";
const migrationsTarget = "dist/server/migrations";

if (!existsSync(configPath)) {
  throw new Error("Build da aplicação não encontrado. Execute pnpm run build primeiro.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const database = config.d1_databases?.find((item) => item.binding === "DB");

if (database) {
  if (!existsSync(migrationsSource)) {
    throw new Error("Migrações do banco D1 não foram encontradas.");
  }

  cpSync(migrationsSource, migrationsTarget, { recursive: true });
  config.migrations_dir = "migrations";
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  runWrangler([
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    "--config",
    configPath,
  ]);
}

runWrangler(["deploy", "--config", configPath]);

function runWrangler(args) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "wrangler", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
