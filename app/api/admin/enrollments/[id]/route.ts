import { asc, desc, eq } from "drizzle-orm";
import { getD1Database, getDb } from "../../../../../db";
import {
  enrollmentDocuments,
  enrollmentHistory,
  enrollmentNotes,
  enrollments,
} from "../../../../../db/schema";
import { adminJson, authorizeAdminRequest, parseEnrollmentId } from "../../admin-request";

const enrollmentStatuses = new Set([
  "Nova",
  "Em contato",
  "Documentação",
  "Matriculado",
  "Arquivado",
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return adminJson({ error: "Matrícula inválida." }, { status: 400 });
  }

  const db = getDb();
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!enrollment) {
    return adminJson({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  const [notes, documents, history] = await Promise.all([
    db
      .select()
      .from(enrollmentNotes)
      .where(eq(enrollmentNotes.enrollmentId, id))
      .orderBy(desc(enrollmentNotes.createdAt), desc(enrollmentNotes.id)),
    db
      .select()
      .from(enrollmentDocuments)
      .where(eq(enrollmentDocuments.enrollmentId, id))
      .orderBy(asc(enrollmentDocuments.label)),
    db
      .select()
      .from(enrollmentHistory)
      .where(eq(enrollmentHistory.enrollmentId, id))
      .orderBy(desc(enrollmentHistory.createdAt), desc(enrollmentHistory.id)),
  ]);

  return adminJson({
    enrollment,
    notes,
    documents,
    history: history.some((item) => item.action === "solicitacao")
      ? history
      : [
          ...history,
          {
            id: 0,
            enrollmentId: enrollment.id,
            action: "solicitacao",
            description: "Solicitação de matrícula recebida pelo site.",
            authorEmail: "site-publico",
            createdAt: enrollment.createdAt,
          },
        ],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return adminJson({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { status?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown };
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  if (!enrollmentStatuses.has(status)) {
    return adminJson({ error: "Status inválido." }, { status: 400 });
  }

  const db = getDb();
  const [current] = await db
    .select({ id: enrollments.id, status: enrollments.status })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!current) {
    return adminJson({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  if (current.status !== status) {
    const database = getD1Database();
    const description =
      status === "Matriculado"
        ? `Candidato marcado como matriculado (antes: ${current.status}).`
        : `Status alterado de ${current.status} para ${status}.`;

    const updateStatus = database
      .prepare("UPDATE enrollments SET status = ? WHERE id = ?")
      .bind(status, id);
    const insertHistory = database
      .prepare(
        `INSERT INTO enrollment_history (
          enrollment_id, action, description, author_email
        ) VALUES (?, 'status', ?, ?)`,
      )
      .bind(id, description, authorization.user.email);

    await database.batch([updateStatus, insertHistory]);
  }

  return adminJson({
    ok: true,
    enrollment: { id, status },
  });
}
