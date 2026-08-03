import { getD1Database } from "../../../../../../db";
import {
  adminJson,
  authorizeAdminRequest,
  parseEnrollmentId,
} from "../../../admin-request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EnrollmentRecord = {
  id: number;
  protocol: string;
  course: string;
  shift: string;
  status: string;
  created_at: string;
};

type ExistingStudent = {
  id: string;
  registration_number: string;
};

function normalizeClassName(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim().replace(/\s+/g, " ");
}

function registrationNumber(enrollment: EnrollmentRecord) {
  const yearMatch = /^(\d{4})-/.exec(enrollment.created_at);
  const year = yearMatch?.[1] || String(new Date().getUTCFullYear());

  return `CENTEP-${year}-${String(enrollment.id).padStart(6, "0")}`;
}

export async function POST(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const enrollmentId = await parseEnrollmentId(context.params);
  if (!enrollmentId) {
    return adminJson({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { className?: unknown };

  try {
    payload = (await request.json()) as { className?: unknown };
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const className = normalizeClassName(payload.className);

  if (
    className.length < 2 ||
    className.length > 80 ||
    /[\u0000-\u001F\u007F]/.test(className)
  ) {
    return adminJson(
      { error: "Informe uma turma válida, com 2 a 80 caracteres." },
      { status: 400 },
    );
  }

  const database = getD1Database();

  const enrollment = await database
    .prepare(
      `SELECT
        id,
        protocol,
        course,
        shift,
        status,
        created_at
      FROM enrollments
      WHERE id = ?
      LIMIT 1`,
    )
    .bind(enrollmentId)
    .first<EnrollmentRecord>();

  if (!enrollment) {
    return adminJson(
      { error: "Candidato não encontrado." },
      { status: 404 },
    );
  }

  const existingStudent = await database
    .prepare(
      `SELECT id, registration_number
       FROM students
       WHERE source_enrollment_id = ?
       LIMIT 1`,
    )
    .bind(enrollmentId)
    .first<ExistingStudent>();

  if (existingStudent) {
    return adminJson(
      {
        error: "Este candidato já possui uma ficha de aluno.",
        student: {
          id: existingStudent.id,
          registrationNumber: existingStudent.registration_number,
        },
      },
      { status: 409 },
    );
  }

  if (enrollment.status !== "Matriculado") {
    return adminJson(
      {
        error:
          "Marque o candidato como matriculado antes de criar a ficha de aluno.",
      },
      { status: 409 },
    );
  }

  const studentId = crypto.randomUUID();
  const academicEnrollmentId = crypto.randomUUID();
  const studentRegistrationNumber = registrationNumber(enrollment);

  const description =
    `Ficha de aluno criada com matrícula ${studentRegistrationNumber}. ` +
    `Curso: ${enrollment.course}. Turma: ${className}.`;

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO students (
            id,
            source_enrollment_id,
            registration_number,
            created_by
          ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          studentId,
          enrollmentId,
          studentRegistrationNumber,
          authorization.user.email,
        ),

      database
        .prepare(
          `INSERT INTO academic_enrollments (
            id,
            student_id,
            course,
            class_name,
            shift,
            status,
            created_by
          ) VALUES (?, ?, ?, ?, ?, 'Ativa', ?)`,
        )
        .bind(
          academicEnrollmentId,
          studentId,
          enrollment.course,
          className,
          enrollment.shift,
          authorization.user.email,
        ),

      database
        .prepare(
          `INSERT INTO enrollment_history (
            enrollment_id,
            action,
            description,
            author_email
          ) VALUES (?, 'conversao', ?, ?)`,
        )
        .bind(
          enrollmentId,
          description,
          authorization.user.email,
        ),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (/UNIQUE constraint failed/i.test(message)) {
      return adminJson(
        { error: "Este candidato já foi convertido em aluno." },
        { status: 409 },
      );
    }

    console.error("Falha ao criar ficha de aluno.", error);

    return adminJson(
      { error: "Não foi possível criar a ficha de aluno." },
      { status: 500 },
    );
  }

  return adminJson(
    {
      ok: true,
      student: {
        id: studentId,
        registrationNumber: studentRegistrationNumber,
        sourceEnrollmentId: enrollmentId,
      },
      academicEnrollment: {
        id: academicEnrollmentId,
        course: enrollment.course,
        className,
        shift: enrollment.shift,
        status: "Ativa",
      },
    },
    { status: 201 },
  );
}