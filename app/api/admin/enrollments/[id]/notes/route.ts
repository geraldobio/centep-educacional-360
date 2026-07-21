import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import {
  enrollmentHistory,
  enrollmentNotes,
  enrollments,
} from "../../../../../../db/schema";
import { authorizeAdminRequest, parseEnrollmentId } from "../../../admin-request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminRequest(request);
  if ("response" in authorization) return authorization.response;

  const id = await parseEnrollmentId(context.params);
  if (!id) {
    return Response.json({ error: "Matrícula inválida." }, { status: 400 });
  }

  let payload: { body?: unknown };
  try {
    payload = (await request.json()) as { body?: unknown };
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 1000) : "";
  if (body.length < 3) {
    return Response.json({ error: "Escreva uma observação com pelo menos 3 caracteres." }, { status: 400 });
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

  const [note] = await db
    .insert(enrollmentNotes)
    .values({
      enrollmentId: id,
      body,
      authorEmail: authorization.user.email,
    })
    .returning();

  await db.insert(enrollmentHistory).values({
    enrollmentId: id,
    action: "observacao",
    description: "Nova observação interna adicionada.",
    authorEmail: authorization.user.email,
  });

  return Response.json({ ok: true, note }, { status: 201 });
}
