import { getD1Database } from "../../../../../db";
import {
  adminJson,
  authorizeAdminRequest,
} from "../../admin-request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AcademicEnrollmentRecord = {
  student_id: string;
  source_enrollment_id: number;
  academic_enrollment_id: string;
  course: string;
  class_name: string;
  shift: string;
  status: string;
};

const academicStatuses = new Set([
  "Ativa",
  "Trancada",
  "Concluída",
  "Cancelada",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function isValidText(value: string, minimum: number, maximum: number) {
  return (
    value.length >= minimum &&
    value.length <= maximum &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const { id: studentId } = await context.params;

  if (!isUuid(studentId)) {
    return adminJson({ error: "Identificador do aluno inválido." }, { status: 400 });
  }

  let payload: {
    academicEnrollmentId?: unknown;
    className?: unknown;
    shift?: unknown;
    status?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const academicEnrollmentId = normalizeText(payload.academicEnrollmentId);
  const className = normalizeText(payload.className);
  const shift = normalizeText(payload.shift);
  const status = normalizeText(payload.status);

  if (!isUuid(academicEnrollmentId)) {
    return adminJson(
      { error: "Vínculo acadêmico inválido." },
      { status: 400 },
    );
  }


  if (!isValidText(className, 2, 80)) {
    return adminJson(
      { error: "Informe uma turma válida, com 2 a 80 caracteres." },
      { status: 400 },
    );
  }

  if (!isValidText(shift, 2, 40)) {
    return adminJson(
      { error: "Informe um turno válido, com 2 a 40 caracteres." },
      { status: 400 },
    );
  }

  if (!academicStatuses.has(status)) {
    return adminJson(
      { error: "Situação acadêmica inválida." },
      { status: 400 },
    );
  }

  const database = getD1Database();

  const current = await database
    .prepare(
      `SELECT
        students.id AS student_id,
        students.source_enrollment_id,
        academic_enrollments.id AS academic_enrollment_id,
        academic_enrollments.course,
        academic_enrollments.class_name,
        academic_enrollments.shift,
        academic_enrollments.status
      FROM students
      INNER JOIN academic_enrollments
        ON academic_enrollments.student_id = students.id
      WHERE students.id = ?
        AND academic_enrollments.id = ?
      LIMIT 1`,
    )
    .bind(studentId, academicEnrollmentId)
    .first<AcademicEnrollmentRecord>();

  if (!current) {
    return adminJson(
      { error: "Aluno ou vínculo acadêmico não encontrado." },
      { status: 404 },
    );
  }

  const changes: string[] = [];


  if (current.class_name !== className) {
    changes.push(`turma de "${current.class_name}" para "${className}"`);
  }

  if (current.shift !== shift) {
    changes.push(`turno de "${current.shift}" para "${shift}"`);
  }

  if (current.status !== status) {
    changes.push(`situação de "${current.status}" para "${status}"`);
  }

  if (changes.length === 0) {
    return adminJson({
      ok: true,
      unchanged: true,
      academicEnrollment: {
        id: academicEnrollmentId,
        course: current.course,
        className,
        shift,
        status,
      },
    });
  }

  const description = `Dados acadêmicos atualizados: ${changes.join("; ")}.`;

  try {
    await database.batch([
      database
        .prepare(
          `UPDATE academic_enrollments
           SET
             class_name = ?,
             shift = ?,
             status = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
             AND student_id = ?`,
        )
        .bind(
          className,
          shift,
          status,
          academicEnrollmentId,
          studentId,
        ),

      database
        .prepare(
          `INSERT INTO enrollment_history (
            enrollment_id,
            action,
            description,
            author_email
          ) VALUES (?, 'academico', ?, ?)`,
        )
        .bind(
          current.source_enrollment_id,
          description,
          authorization.user.email,
        ),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (/UNIQUE constraint failed/i.test(message)) {
      return adminJson(
        {
          error:
            "Este aluno já possui um vínculo com o mesmo curso e a mesma turma.",
        },
        { status: 409 },
      );
    }

    console.error("Falha ao atualizar dados acadêmicos.", error);

    return adminJson(
      { error: "Não foi possível atualizar os dados acadêmicos." },
      { status: 500 },
    );
  }

  return adminJson({
    ok: true,
    unchanged: false,
    academicEnrollment: {
      id: academicEnrollmentId,
      course,
      className,
      shift,
      status,
    },
  });
}