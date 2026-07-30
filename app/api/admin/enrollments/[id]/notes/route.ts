import { eq } from "drizzle-orm";
import { getD1Database, getDb } from "../../../../../../db";
import { enrollments } from "../../../../../../db/schema";
import { adminJson, authorizeAdminRequest, parseEnrollmentId } from "../../../admin-request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type NoteRow = {
  id: number;
  enrollmentId: number;
  body: string;
  authorEmail: string;
  createdAt: string;
};

export async function POST(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return adminJson({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { body?: unknown };
  try {
    payload = (await request.json()) as { body?: unknown };
  } catch {
    return adminJson({ error: "Dados inválidos." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 1000) : "";
  if (body.length < 3) {
    return adminJson(
      { error: "Escreva uma observação com pelo menos 3 caracteres." },
      { status: 400 },
    );
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
    const insertNote = database
      .prepare(
        `INSERT INTO enrollment_notes (enrollment_id, body, author_email)
         VALUES (?, ?, ?)
         RETURNING
           id,
           enrollment_id AS enrollmentId,
           body,
           author_email AS authorEmail,
           created_at AS createdAt`,
      )
      .bind(id, body, authorization.user.email);
    const insertHistory = database
      .prepare(
        `INSERT INTO enrollment_history (
          enrollment_id, action, description, author_email
        ) VALUES (?, 'observacao', 'Nova observação interna adicionada.', ?)`,
      )
      .bind(id, authorization.user.email);

    const [noteResult] = await database.batch([insertNote, insertHistory]);
    const note = noteResult.results?.[0] as NoteRow | undefined;
    if (!note) {
      throw new Error("D1 did not return the created enrollment note.");
    }

    return adminJson({ ok: true, note }, { status: 201 });
  } catch (error) {
    console.error("Enrollment note creation failed", error);
    return adminJson(
      { error: "Não foi possível salvar a observação agora. Tente novamente." },
      { status: 500 },
    );
  }
}
