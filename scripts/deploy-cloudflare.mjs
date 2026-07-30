import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";

const configPath = "dist/server/wrangler.json";
const migrationsSource = "drizzle";
const migrationsTarget = "dist/server/migrations";
const backupDirectory = process.env.D1_BACKUP_DIR?.trim() || "backups/d1";

if (!existsSync(configPath)) {
  throw new Error("Build da aplicação não encontrado. Execute pnpm run build primeiro.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const database = config.d1_databases?.find((item) => item.binding === "DB");

if (database) {
  if (!existsSync(migrationsSource)) {
    throw new Error("Migrações do banco D1 não foram encontradas.");
  }

  rmSync(migrationsTarget, { recursive: true, force: true });
  cpSync(migrationsSource, migrationsTarget, { recursive: true });
  database.migrations_dir = "migrations";
  delete database.migrations_pattern;
  delete config.migrations_dir;
  delete config.migrations_pattern;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const backupPath = createBackupPath();
  runWrangler([
    "d1",
    "export",
    "DB",
    "--remote",
    "--output",
    backupPath,
    "--y",
    "--config",
    configPath,
  ]);
  if (!existsSync(backupPath) || statSync(backupPath).size === 0) {
    throw new Error("O backup remoto do D1 não foi criado. A migração foi interrompida.");
  }
  console.log(`Backup do D1 criado em ${backupPath}`);

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

function createBackupPath() {
  mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${backupDirectory}/centep-d1-${timestamp}.sql`;
}

function runWrangler(args) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "wrangler", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
