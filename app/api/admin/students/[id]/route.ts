import { getD1Database } from "../../../../../db";
import {
  adminJson,
  authorizeAdminRequest,
} from "../../admin-request";
import {
  buildAcademicUpdate,
  isAcademicUpdatePayload,
  isUuid,
  normalizeAcademicUpdatePayload,
  validateAcademicUpdate,
} from "./validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AcademicEnrollmentRecord = {
  source_enrollment_id: number;
  course: string;
  class_name: string;
  shift: string;
  status: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const { id: studentId } = await context.params;

  if (!isUuid(studentId)) {
    return adminJson(
      { error: "Identificador do aluno inválido." },
      { status: 400 },
    );
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!isAcademicUpdatePayload(rawPayload)) {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const requested = normalizeAcademicUpdatePayload(rawPayload);
  const validationError = validateAcademicUpdate(requested);

  if (validationError) {
    return adminJson({ error: validationError }, { status: 400 });
  }

  const database = getD1Database();

  const current = await database
    .prepare(
      `SELECT
        students.source_enrollment_id,
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
    .bind(studentId, requested.academicEnrollmentId)
    .first<AcademicEnrollmentRecord>();

  if (!current) {
    return adminJson(
      { error: "Aluno ou vínculo acadêmico não encontrado." },
      { status: 404 },
    );
  }

  const update = buildAcademicUpdate(
    {
      course: current.course,
      className: current.class_name,
      shift: current.shift,
      status: current.status,
    },
    requested,
  );

  if (update.unchanged) {
    return adminJson({
      ok: true,
      unchanged: true,
      academicEnrollment: update.academicEnrollment,
    });
  }

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
          update.academicEnrollment.className,
          update.academicEnrollment.shift,
          update.academicEnrollment.status,
          update.academicEnrollment.id,
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
          update.description,
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
    academicEnrollment: update.academicEnrollment,
  });
}