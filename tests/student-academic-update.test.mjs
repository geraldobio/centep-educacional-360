import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const sourceUrl = new URL(
  "../app/api/admin/students/[id]/validation.ts",
  import.meta.url,
);

const source = await readFile(sourceUrl, "utf8");

const JavaScript = stripTypeScriptTypes(source, {
  mode: "strip",
  sourceUrl: sourceUrl.href,
});

const moduleUrl =
  `data:text/javascript;base64,${Buffer.from(JavaScript).toString("base64")}`;

const {
  buildAcademicUpdate,
  isAcademicUpdatePayload,
  isUuid,
  normalizeAcademicUpdatePayload,
  validateAcademicUpdate,
} = await import(moduleUrl);

const academicEnrollmentId =
  "11111111-1111-4111-8111-111111111111";

function validPayload(overrides = {}) {
  return {
    academicEnrollmentId,
    className: "Turma Som 2026.2",
    shift: "Manhã",
    status: "Ativa",
    ...overrides,
  };
}

test("student academic update validation", async (t) => {
  await t.test("accepts only plain object-like JSON payloads", () => {
    assert.equal(isAcademicUpdatePayload({}), true);
    assert.equal(isAcademicUpdatePayload(Object.create(null)), true);
    assert.equal(isAcademicUpdatePayload(null), false);
    assert.equal(isAcademicUpdatePayload([]), false);
    assert.equal(isAcademicUpdatePayload("payload"), false);
    assert.equal(isAcademicUpdatePayload(42), false);
  });

  await t.test("validates UUIDs used by students and academic records", () => {
    assert.equal(isUuid(academicEnrollmentId), true);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(
      isUuid("11111111-1111-0111-8111-111111111111"),
      false,
    );
  });

  await t.test("normalizes accepted fields and ignores course injection", () => {
    const normalized = normalizeAcademicUpdatePayload({
      academicEnrollmentId: `  ${academicEnrollmentId}  `,
      className: "  Turma   Som   2026.2  ",
      shift: "  Final   de semana ",
      status: " Ativa ",
      course: "Curso adulterado",
    });

    assert.deepEqual(normalized, {
      academicEnrollmentId,
      className: "Turma Som 2026.2",
      shift: "Final de semana",
      status: "Ativa",
    });
  });

  await t.test("accepts every supported academic status", () => {
    for (const status of [
      "Ativa",
      "Trancada",
      "Concluída",
      "Cancelada",
    ]) {
      const normalized = normalizeAcademicUpdatePayload(
        validPayload({ status }),
      );

      assert.equal(validateAcademicUpdate(normalized), null);
    }
  });

  await t.test("rejects invalid identifiers and academic fields", () => {
    const cases = [
      [
        { academicEnrollmentId: "invalid" },
        "Vínculo acadêmico inválido.",
      ],
      [
        { className: "A" },
        "Informe uma turma válida, com 2 a 80 caracteres.",
      ],
      [
        { className: `Turma\u0000A` },
        "Informe uma turma válida, com 2 a 80 caracteres.",
      ],
      [
        { shift: "N" },
        "Informe um turno válido, com 2 a 40 caracteres.",
      ],
      [
        { status: "Pendente" },
        "Situação acadêmica inválida.",
      ],
    ];

    for (const [overrides, expectedError] of cases) {
      const normalized = normalizeAcademicUpdatePayload(
        validPayload(overrides),
      );

      assert.equal(
        validateAcademicUpdate(normalized),
        expectedError,
      );
    }
  });

  await t.test("detects an unchanged academic record", () => {
    const requested = normalizeAcademicUpdatePayload(validPayload());

    const result = buildAcademicUpdate(
      {
        course: "Técnico e Operador de Som",
        className: "Turma Som 2026.2",
        shift: "Manhã",
        status: "Ativa",
      },
      requested,
    );

    assert.deepEqual(result, {
      unchanged: true,
      description: null,
      academicEnrollment: {
        id: academicEnrollmentId,
        course: "Técnico e Operador de Som",
        className: "Turma Som 2026.2",
        shift: "Manhã",
        status: "Ativa",
      },
    });
  });

  await t.test("builds a complete and auditable change description", () => {
    const requested = normalizeAcademicUpdatePayload(
      validPayload({
        className: "Turma Avançada 2027.1",
        shift: "Noite",
        status: "Trancada",
        course: "Curso adulterado",
      }),
    );

    const result = buildAcademicUpdate(
      {
        course: "Técnico e Operador de Som",
        className: "Turma Som 2026.2",
        shift: "Manhã",
        status: "Ativa",
      },
      requested,
    );

    assert.equal(result.unchanged, false);
    assert.equal(
      result.description,
      'Dados acadêmicos atualizados: turma de "Turma Som 2026.2" ' +
        'para "Turma Avançada 2027.1"; turno de "Manhã" para "Noite"; ' +
        'situação de "Ativa" para "Trancada".',
    );

    assert.deepEqual(result.academicEnrollment, {
      id: academicEnrollmentId,
      course: "Técnico e Operador de Som",
      className: "Turma Avançada 2027.1",
      shift: "Noite",
      status: "Trancada",
    });
  });

  await t.test("keeps course immutable in the HTTP and SQL adapter", async () => {
    const routeSource = await readFile(
      new URL(
        "../app/api/admin/students/[id]/route.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(routeSource, /payload\.course/);
    assert.doesNotMatch(routeSource, /\bcourse\s*=\s*\?/);
    assert.match(routeSource, /authorizeAdminRequest/);
    assert.match(routeSource, /INSERT INTO enrollment_history/);
  });
});