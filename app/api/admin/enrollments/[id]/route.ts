import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  enrollmentDocuments,
  enrollmentHistory,
  enrollmentNotes,
  enrollments,
} from "../../../../../db/schema";
import { authorizeAdminRequest, parseEnrollmentId } from "../../admin-request";

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
    return Response.json({ error: "Matrícula inválida." }, { status: 400 });
  }

  const db = getDb();
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!enrollment) {
    return Response.json({ error: "Matrícula não encontrada." }, { status: 404 });
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

  return Response.json({
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
    return Response.json({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { status?: unknown };
  try {
    payload = (await request.json()) as { status?: unknown };
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  if (!enrollmentStatuses.has(status)) {
    return Response.json({ error: "Status inválido." }, { status: 400 });
  }

  const db = getDb();
  const [current] = await db
    .select({ id: enrollments.id, status: enrollments.status })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!current) {
    return Response.json({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  if (current.status !== status) {
    await db.update(enrollments).set({ status }).where(eq(enrollments.id, id));
    await db.insert(enrollmentHistory).values({
      enrollmentId: id,
      action: status === "Matriculado" ? "conversao" : "status",
      description:
        status === "Matriculado"
          ? `Candidato convertido em aluno matriculado (antes: ${current.status}).`
          : `Status alterado de ${current.status} para ${status}.`,
      authorEmail: authorization.user.email,
    });
  }

  return Response.json({
    ok: true,
    enrollment: { id, status },
  });
}
