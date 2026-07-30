import { eq } from "drizzle-orm";
import { getD1Database, getDb } from "../../../../../../db";
import { enrollments } from "../../../../../../db/schema";
import { adminJson, authorizeAdminRequest, parseEnrollmentId } from "../../../admin-request";

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

type DocumentRow = {
  id: number;
  enrollmentId: number;
  documentType: string;
  label: string;
  status: string;
  note: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return adminJson({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { documentType?: unknown; status?: unknown; note?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const documentType =
    typeof payload.documentType === "string" ? payload.documentType.trim() : "";
  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";
  const label = documentLabels[documentType];

  if (!label || !documentStatuses.has(status)) {
    return adminJson({ error: "Documento ou status inválido." }, { status: 400 });
  }

  const db = getDb();
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!enrollment) {
    return adminJson({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  try {
    const database = getD1Database();
    const upsertDocument = database
      .prepare(
        `INSERT INTO enrollment_documents (
          enrollment_id, document_type, label, status, note, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(enrollment_id, document_type) DO UPDATE SET
          label = excluded.label,
          status = excluded.status,
          note = excluded.note,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          id,
          enrollment_id AS enrollmentId,
          document_type AS documentType,
          label,
          status,
          note,
          updated_by AS updatedBy,
          created_at AS createdAt,
          updated_at AS updatedAt`,
      )
      .bind(id, documentType, label, status, note, authorization.user.email);
    const insertHistory = database
      .prepare(
        `INSERT INTO enrollment_history (
          enrollment_id, action, description, author_email
        ) VALUES (?, 'documento', ?, ?)`,
      )
      .bind(id, `${label} marcado como ${status}.`, authorization.user.email);

    const [documentResult] = await database.batch([upsertDocument, insertHistory]);
    const document = documentResult.results?.[0] as DocumentRow | undefined;
    if (!document) {
      throw new Error("D1 did not return the updated enrollment document.");
    }

    return adminJson({ ok: true, document });
  } catch (error) {
    console.error("Enrollment document update failed", error);
    return adminJson(
      { error: "Não foi possível atualizar o documento agora. Tente novamente." },
      { status: 500 },
    );
  }
}
