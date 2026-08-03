import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const buildConfigPath = resolve("dist/server/wrangler.json");
const testConfigPath = resolve("dist/server/wrangler.migration-test.json");
const migrationsDir = resolve("dist/server/migrations-test");
const persistenceDir = resolve(".wrangler/d1-migration-test");
const binding = "DB";

if (!existsSync(buildConfigPath)) {
  throw new Error("Build do Cloudflare Worker não encontrado. Execute pnpm run build primeiro.");
}

const config = JSON.parse(readFileSync(buildConfigPath, "utf8"));
if (!config.d1_databases?.some((database) => database.binding === binding)) {
  throw new Error("O build não contém o binding D1 `DB`.");
}

rmSync(migrationsDir, { recursive: true, force: true });
rmSync(persistenceDir, { recursive: true, force: true });
mkdirSync(migrationsDir, { recursive: true });
mkdirSync(dirname(testConfigPath), { recursive: true });

const testConfig = {
  ...config,
  d1_databases: config.d1_databases.map((database) => {
    if (database.binding !== binding) return database;
    const configuredDatabase = {
      ...database,
      migrations_dir: "migrations-test",
    };
    delete configuredDatabase.migrations_pattern;
    return configuredDatabase;
  }),
};
delete testConfig.migrations_dir;
delete testConfig.migrations_pattern;
writeFileSync(testConfigPath, `${JSON.stringify(testConfig, null, 2)}\n`, "utf8");

try {
  copyFileSync(
    resolve("drizzle/0000_conscious_viper.sql"),
    resolve(migrationsDir, "0000_conscious_viper.sql"),
  );
  applyMigrations();

  executeSql(`
    INSERT INTO enrollments (
      protocol, name, cpf, birth_date, email, phone, city, course, shift,
      experience, message, status
    ) VALUES (
      'CENTEP-TEST-0001', 'Candidato Existente', '00000000000', '2000-01-01',
      'teste@centep.local', '71999999999', 'Pojuca', 'Mixagem na Prática',
      'Noturno', 'Iniciante', 'Registro anterior à migração', 'Nova'
    );
  `);

  copyFileSync(
    resolve("drizzle/0001_chubby_madelyne_pryor.sql"),
    resolve(migrationsDir, "0001_chubby_madelyne_pryor.sql"),
  );
  applyMigrations();

  copyFileSync(
    resolve("drizzle/0002_unique_lockjaw.sql"),
    resolve(migrationsDir, "0002_unique_lockjaw.sql"),
  );
  applyMigrations();

  const schemaCheck = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM enrollments WHERE protocol = 'CENTEP-TEST-0001') AS enrollment_count,
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type = 'table'
          AND name IN ('enrollment_notes', 'enrollment_history', 'enrollment_documents')) AS table_count,
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type = 'index'
          AND name IN (
            'enrollment_notes_enrollment_created_idx',
            'enrollment_history_enrollment_created_idx',
            'enrollment_documents_enrollment_type_unique',
            'enrollment_documents_status_idx'
          )) AS index_count;
  `);

  assertNumber(schemaCheck.enrollment_count, 1, "A matrícula existente não foi preservada.");
  assertNumber(schemaCheck.table_count, 3, "Nem todas as tabelas da ficha foram criadas.");
  assertNumber(schemaCheck.index_count, 4, "Nem todos os índices da ficha foram criados.");

  const studentSchemaCheck = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type = 'table'
          AND name IN ('students', 'academic_enrollments')) AS table_count,
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type = 'index'
          AND name IN (
            'students_source_enrollment_unique',
            'students_registration_number_unique',
            'academic_enrollments_student_course_class_unique',
            'academic_enrollments_status_idx',
            'academic_enrollments_course_class_idx'
          )) AS index_count;
  `);

  assertNumber(studentSchemaCheck.table_count, 2, "As tabelas acadêmicas não foram criadas.");
  assertNumber(studentSchemaCheck.index_count, 5, "Os índices acadêmicos não foram criados.");

  executeSql(`
    INSERT INTO enrollment_notes (enrollment_id, body, author_email)
      SELECT id, 'Observação de teste', 'ci@centep.local'
      FROM enrollments WHERE protocol = 'CENTEP-TEST-0001';
    INSERT INTO enrollment_history (enrollment_id, action, description, author_email)
      SELECT id, 'teste', 'Histórico de teste', 'ci@centep.local'
      FROM enrollments WHERE protocol = 'CENTEP-TEST-0001';
    INSERT INTO enrollment_documents (
      enrollment_id, document_type, label, status, note, updated_by
    )
      SELECT id, 'cpf', 'CPF', 'Recebido', '', 'ci@centep.local'
      FROM enrollments WHERE protocol = 'CENTEP-TEST-0001';
  `);

  const relationshipCheck = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM enrollment_notes) AS note_count,
      (SELECT COUNT(*) FROM enrollment_history) AS history_count,
      (SELECT COUNT(*) FROM enrollment_documents) AS document_count;
  `);
  assertNumber(relationshipCheck.note_count, 1, "A observação vinculada não foi criada.");
  assertNumber(relationshipCheck.history_count, 1, "O histórico vinculado não foi criado.");
  assertNumber(relationshipCheck.document_count, 1, "O documento vinculado não foi criado.");

  executeSql(`
    INSERT INTO students (
      id, source_enrollment_id, registration_number, created_by
    )
      SELECT
        'student-test-0001',
        id,
        'CENTEP-ALUNO-0001',
        'ci@centep.local'
      FROM enrollments
      WHERE protocol = 'CENTEP-TEST-0001';

    INSERT OR IGNORE INTO students (
      id, source_enrollment_id, registration_number, created_by
    )
      SELECT
        'student-test-duplicate',
        id,
        'CENTEP-ALUNO-0002',
        'ci@centep.local'
      FROM enrollments
      WHERE protocol = 'CENTEP-TEST-0001';

    INSERT INTO academic_enrollments (
      id, student_id, course, class_name, shift, status, created_by
    ) VALUES (
      'academic-test-0001',
      'student-test-0001',
      'Mixagem na Prática',
      'Turma Teste',
      'Noturno',
      'Ativa',
      'ci@centep.local'
    );

    INSERT OR IGNORE INTO academic_enrollments (
      id, student_id, course, class_name, shift, status, created_by
    ) VALUES (
      'academic-test-duplicate',
      'student-test-0001',
      'Mixagem na Prática',
      'Turma Teste',
      'Noturno',
      'Ativa',
      'ci@centep.local'
    );
  `);

  const studentCheck = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM students) AS student_count,
      (SELECT COUNT(*) FROM academic_enrollments) AS academic_count;
  `);

  assertNumber(studentCheck.student_count, 1, "A conversão duplicada do candidato não foi bloqueada.");
  assertNumber(studentCheck.academic_count, 1, "A matrícula acadêmica duplicada não foi bloqueada.");

  executeSql(`
    DELETE FROM students WHERE id = 'student-test-0001';
  `);

  const studentCascadeCheck = queryOne(`
    SELECT COUNT(*) AS academic_count FROM academic_enrollments;
  `);

  assertNumber(
    studentCascadeCheck.academic_count,
    0,
    "A exclusão em cascata da matrícula acadêmica falhou.",
  );

  executeSql(`
    DELETE FROM enrollments WHERE protocol = 'CENTEP-TEST-0001';
  `);

  const cascadeCheck = queryOne(`
    SELECT
      (SELECT COUNT(*) FROM enrollment_notes) AS note_count,
      (SELECT COUNT(*) FROM enrollment_history) AS history_count,
      (SELECT COUNT(*) FROM enrollment_documents) AS document_count;
  `);
  assertNumber(cascadeCheck.note_count, 0, "A exclusão em cascata falhou para observações.");
  assertNumber(cascadeCheck.history_count, 0, "A exclusão em cascata falhou para o histórico.");
  assertNumber(cascadeCheck.document_count, 0, "A exclusão em cascata falhou para documentos.");

  applyMigrations();
  console.log("Migrações D1 validadas com dados existentes e relacionamentos íntegros.");
} finally {
  rmSync(testConfigPath, { force: true });
  rmSync(migrationsDir, { recursive: true, force: true });
  rmSync(persistenceDir, { recursive: true, force: true });
}

function applyMigrations() {
  runWrangler([
    "d1",
    "migrations",
    "apply",
    binding,
    "--local",
    "--persist-to",
    persistenceDir,
    "--config",
    testConfigPath,
  ]);
}

function executeSql(sql) {
  withSqlFile(sql, (sqlPath) => {
    runWrangler([
      "d1",
      "execute",
      binding,
      "--local",
      "--persist-to",
      persistenceDir,
      "--config",
      testConfigPath,
      "--file",
      sqlPath,
      "--yes",
    ]);
  });
}

function queryOne(sql) {
  return withSqlFile(sql, (sqlPath) => {
    const stdout = runWrangler([
      "d1",
      "execute",
      binding,
      "--local",
      "--persist-to",
      persistenceDir,
      "--config",
      testConfigPath,
      "--file",
      sqlPath,
      "--json",
    ], true);

    const response = JSON.parse(stdout);
    const results = Array.isArray(response) ? response : [response];
    const row = results.flatMap((item) => item?.results ?? [])[0];

    if (!row) {
      throw new Error("A consulta de validação do D1 não retornou resultado.");
    }

    return row;
  });
}

function withSqlFile(sql, operation) {
  const sqlPath = resolve(
    "dist/server",
    `.d1-migration-test-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.sql`,
  );

  writeFileSync(sqlPath, `${sql.trim()}\n`, "utf8");

  try {
    return operation(sqlPath);
  } finally {
    rmSync(sqlPath, { force: true });
  }
}

function assertNumber(actual, expected, message) {
  if (Number(actual) !== expected) {
    throw new Error(`${message} Esperado: ${expected}; recebido: ${String(actual)}.`);
  }
}

function runWrangler(args, captureOutput = false) {
  const isWindows = process.platform === "win32";
  const command = isWindows ? (process.env.ComSpec || "cmd.exe") : "pnpm";
  const commandArgs = isWindows
    ? ["/d", "/s", "/c", "pnpm.cmd", "exec", "wrangler", ...args]
    : ["exec", "wrangler", ...args];

  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    env: process.env,
    stdio: captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout ?? "";
}
