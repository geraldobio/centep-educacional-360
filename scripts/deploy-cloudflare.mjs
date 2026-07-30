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

const EXPECTED_ACCOUNT_ID = "e3769ad13a3480696aeb46ab69936314";
const EXPECTED_WORKER_NAME = "centep-educacional-360";
const EXPECTED_DATABASE_NAME = "centep-360-db";
const EXPECTED_DATABASE_ID = "982ee1b0-a80d-4e30-b1b4-1ef27c83c25b";
const EXPECTED_ACCESS_TEAM_DOMAIN = "https://icy-tooth-b64e.cloudflareaccess.com";
const EXPECTED_ACCESS_AUDIENCE =
  "3a2fa4fc4f950b7678d9cc92cfde22cc80b4a09d08cfb04a7756ff97e724437c";

const configPath = "dist/server/wrangler.json";
const migrationsSource = "drizzle";
const migrationsTarget = "dist/server/migrations";
const backupDirectory = process.env.D1_BACKUP_DIR?.trim() || "backups/d1";

if (process.env.CONFIRM_PRODUCTION_DEPLOY !== "PRODUCAO") {
  throw new Error(
    "Defina CONFIRM_PRODUCTION_DEPLOY=PRODUCAO somente após autorização explícita para preparar a versão de produção.",
  );
}

if (process.env.WORKERS_CI === "1") {
  throw new Error(
    "Preparação de produção bloqueada no Workers Builds: o backup local do D1 não teria armazenamento durável. Execute em um ambiente controlado que preserve o arquivo de backup.",
  );
}

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
required("CLOUDFLARE_API_TOKEN");
const accessTeamDomain = normalizeTeamDomain(required("CF_ACCESS_TEAM_DOMAIN"));
const accessAudience = required("CF_ACCESS_AUD");

assertExact("Conta Cloudflare", accountId, EXPECTED_ACCOUNT_ID);
assertExact("Domínio do Cloudflare Access", accessTeamDomain, EXPECTED_ACCESS_TEAM_DOMAIN);
assertExact("Audience do Cloudflare Access", accessAudience, EXPECTED_ACCESS_AUDIENCE);

if (!existsSync(configPath)) {
  throw new Error("Build da aplicação não encontrado. Execute pnpm run build primeiro.");
}
if (!existsSync(migrationsSource)) {
  throw new Error("Migrações do banco D1 não foram encontradas.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
assertExact("Worker de produção", config.name, EXPECTED_WORKER_NAME);

const database = config.d1_databases?.find((item) => item.binding === "DB");
if (!database) {
  throw new Error("O build de produção não contém o binding D1 `DB`.");
}
assertExact("Banco D1 de produção", database.database_name, EXPECTED_DATABASE_NAME);
assertExact("ID do banco D1 de produção", database.database_id, EXPECTED_DATABASE_ID);

config.keep_vars = true;
config.preview_urls = true;
config.vars = {
  ...(config.vars || {}),
  CF_ACCESS_AUD: accessAudience,
  CF_ACCESS_TEAM_DOMAIN: accessTeamDomain,
};

database.migrations_dir = "migrations";
delete database.migrations_pattern;
delete config.migrations_dir;
delete config.migrations_pattern;

rmSync(migrationsTarget, { recursive: true, force: true });
cpSync(migrationsSource, migrationsTarget, { recursive: true });
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync(backupDirectory, { recursive: true });

const bookmarkPath = `${backupDirectory}/centep-d1-${timestamp}.bookmark.json`;
const bookmarkJson = runWrangler(
  ["d1", "time-travel", "info", "DB", "--json", "--config", configPath],
  true,
);
validateJsonOutput(bookmarkJson, "bookmark do Time Travel");
writeFileSync(bookmarkPath, bookmarkJson.trim() + "\n", "utf8");
chmodSync(bookmarkPath, 0o600);
console.log(`Bookmark do D1 salvo em ${bookmarkPath}`);

const backupPath = `${backupDirectory}/centep-d1-${timestamp}.sql`;
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
chmodSync(backupPath, 0o600);
console.log(`Backup do D1 criado em ${backupPath}`);

runWrangler([
  "d1",
  "migrations",
  "list",
  "DB",
  "--remote",
  "--config",
  configPath,
]);
runWrangler([
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  configPath,
]);

runWrangler([
  "versions",
  "upload",
  "--config",
  configPath,
  "--keep-vars",
  "--strict",
  "--preview-alias",
  "release-candidate",
  "--message",
  "CENTEP production release candidate",
]);

console.log(
  "Versão de produção enviada como release candidate. Nenhum tráfego foi promovido automaticamente.",
);
console.log("Teste a URL de pré-visualização antes de criar uma implantação de produção.");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function assertExact(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} inesperado. Esperado: ${expected}; recebido: ${String(actual)}.`);
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

function validateJsonOutput(value, label) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") throw new Error("invalid object");
  } catch {
    throw new Error(`Não foi possível validar o ${label}.`);
  }
}

function runWrangler(args, captureOutput = false) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "wrangler", ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout ?? "";
}
