import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";

const generatedConfigPath = "dist/server/wrangler.json";
const stagingConfigPath = "dist/server/wrangler.staging.json";
const migrationsSource = "drizzle";
const migrationsTarget = "dist/server/migrations";
const backupDirectory = process.env.D1_STAGING_BACKUP_DIR?.trim() || "backups/d1-staging";

const workerName = required("STAGING_WORKER_NAME");
const databaseId = required("STAGING_D1_DATABASE_ID");
const databaseName = required("STAGING_D1_DATABASE_NAME");
const accessTeamDomain = required("CF_ACCESS_TEAM_DOMAIN");
const accessAudience = required("CF_ACCESS_AUD");
required("CLOUDFLARE_ACCOUNT_ID");
required("CLOUDFLARE_API_TOKEN");

if (process.env.CONFIRM_STAGING_DEPLOY !== "HOMOLOGACAO") {
  throw new Error(
    "Defina CONFIRM_STAGING_DEPLOY=HOMOLOGACAO para confirmar uma implantação exclusiva de homologação.",
  );
}

assertStagingResource("STAGING_WORKER_NAME", workerName);
assertStagingResource("STAGING_D1_DATABASE_NAME", databaseName);

const normalizedTeamDomain = normalizeTeamDomain(accessTeamDomain);

runPnpm(["run", "build"], {
  CLOUDFLARE_DIRECT_DEPLOY: "1",
  CLOUDFLARE_D1_DATABASE_ID: databaseId,
  CLOUDFLARE_D1_DATABASE_NAME: databaseName,
});

if (!existsSync(generatedConfigPath)) {
  throw new Error("Build da aplicação não gerou dist/server/wrangler.json.");
}
if (!existsSync(migrationsSource)) {
  throw new Error("Migrações do banco D1 não foram encontradas.");
}

const config = JSON.parse(readFileSync(generatedConfigPath, "utf8"));
const database = config.d1_databases?.find((item) => item.binding === "DB");
if (!database) {
  throw new Error("O build de homologação não contém o binding D1 `DB`.");
}

config.name = workerName;
config.workers_dev = true;
config.preview_urls = true;
delete config.route;
delete config.routes;
config.vars = {
  ...(config.vars || {}),
  CF_ACCESS_AUD: accessAudience,
  CF_ACCESS_TEAM_DOMAIN: normalizedTeamDomain,
};

database.database_id = databaseId;
database.database_name = databaseName;
database.migrations_dir = "migrations";
delete database.migrations_pattern;
delete config.migrations_dir;
delete config.migrations_pattern;

rmSync(migrationsTarget, { recursive: true, force: true });
cpSync(migrationsSource, migrationsTarget, { recursive: true });
writeFileSync(stagingConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

if (process.env.STAGING_DRY_RUN === "1") {
  runWrangler([
    "deploy",
    "--dry-run",
    "--config",
    stagingConfigPath,
    "--outdir",
    "dist/worker-staging-dry-run",
  ]);
  console.log("Dry run de homologação concluído. Nenhum recurso remoto foi alterado.");
  process.exit(0);
}

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
  stagingConfigPath,
]);
if (!existsSync(backupPath) || statSync(backupPath).size === 0) {
  throw new Error("O backup do D1 de homologação não foi criado. A migração foi interrompida.");
}
chmodSync(backupPath, 0o600);
console.log(`Backup de homologação criado em ${backupPath}`);

runWrangler([
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  stagingConfigPath,
]);

runWrangler(["deploy", "--config", stagingConfigPath]);
console.log("Implantação de homologação concluída. Produção não foi alterada.");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function assertStagingResource(name, value) {
  if (!/(staging|stage|homolog|hml)/i.test(value)) {
    throw new Error(
      `${name} deve identificar claramente um recurso de homologação (staging, homolog ou hml).`,
    );
  }
}

function normalizeTeamDomain(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("CF_ACCESS_TEAM_DOMAIN deve ser uma origem HTTPS sem caminho ou parâmetros.");
  }
  return url.origin;
}

function createBackupPath() {
  mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${backupDirectory}/${databaseName}-${timestamp}.sql`;
}

function runPnpm(args, extraEnv = {}) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  finish(result);
}

function runWrangler(args) {
  runPnpm(["exec", "wrangler", ...args]);
}

function finish(result) {
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
