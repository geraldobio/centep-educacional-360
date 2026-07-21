import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import {
  enrollmentDocuments,
  enrollmentHistory,
  enrollments,
} from "../../../../../../db/schema";
import { authorizeAdminRequest, parseEnrollmentId } from "../../../admin-request";

const documentLabels: Record<string, string> = {
  identidade: "Documento de identidade",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de residência",
  foto: "Foto 3x4",
  contrato: "Contrato de matrícula",
};

const documentStatuses = new Set(["Pendente", "Recebido", "Validado", "Dispensado"]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return Response.json({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { documentType?: unknown; status?: unknown; note?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const documentType =
    typeof payload.documentType === "string" ? payload.documentType.trim() : "";
  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";

  if (!documentLabels[documentType] || !documentStatuses.has(status)) {
    return Response.json({ error: "Documento ou status inválido." }, { status: 400 });
  }

  const db = getDb();
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!enrollment) {
    return Response.json({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  const [document] = await db
    .insert(enrollmentDocuments)
    .values({
      enrollmentId: id,
      documentType,
      label: documentLabels[documentType],
      status,
      note,
      updatedBy: authorization.user.email,
    })
    .onConflictDoUpdate({
      target: [enrollmentDocuments.enrollmentId, enrollmentDocuments.documentType],
      set: {
        status,
        note,
        updatedBy: authorization.user.email,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();

  await db.insert(enrollmentHistory).values({
    enrollmentId: id,
    action: "documento",
    description: `${documentLabels[documentType]} marcado como ${status}.`,
    authorEmail: authorization.user.email,
  });

  return Response.json({ ok: true, document });
}
