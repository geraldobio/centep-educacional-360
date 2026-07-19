import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { enrollments } from "../../../../../db/schema";
import { getChatGPTUser, isCentepAdminEmail } from "../../../../chatgpt-auth";

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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  if (!isCentepAdminEmail(user.email)) {
    return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const requestOrigin = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  if (requestOrigin && requestHost && new URL(requestOrigin).host !== requestHost) {
    return Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  }

  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
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
  const updated = await db
    .update(enrollments)
    .set({ status })
    .where(eq(enrollments.id, id))
    .returning({ id: enrollments.id, status: enrollments.status });

  if (!updated.length) {
    return Response.json({ error: "Matrícula não encontrada." }, { status: 404 });
  }

  return Response.json({ ok: true, enrollment: updated[0] });
}
