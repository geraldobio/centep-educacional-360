import { getD1Database } from "../../../db";
import {
  cleanEnrollmentValue,
  isEnrollmentPayload,
  isValidEnrollmentData,
  normalizeEnrollmentPayload,
  type EnrollmentPayload,
} from "./validation";

const MAX_REQUEST_BYTES = 16_384;

function publicJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return publicJson({ error: "Formato da solicitação não suportado." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return publicJson({ error: "A solicitação excede o tamanho permitido." }, { status: 413 });
  }

  let payload: EnrollmentPayload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return publicJson({ error: "A solicitação excede o tamanho permitido." }, { status: 413 });
    }
    const parsedPayload: unknown = JSON.parse(rawBody);
    if (!isEnrollmentPayload(parsedPayload)) {
      return publicJson({ error: "Dados inválidos." }, { status: 400 });
    }
    payload = parsedPayload;
  } catch {
    return publicJson({ error: "Dados inválidos." }, { status: 400 });
  }

  if (cleanEnrollmentValue(payload.website)) {
    return publicJson({ ok: true }, { status: 201 });
  }

  const data = normalizeEnrollmentPayload(payload);
  if (!isValidEnrollmentData(data)) {
    return publicJson(
      { error: "Confira os campos obrigatórios, o CPF e o consentimento antes de continuar." },
      { status: 400 },
    );
  }

  try {
    const protocol = `CENTEP-${new Date().getUTCFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    const database = getD1Database();

    const insertEnrollment = database
      .prepare(
        `INSERT INTO enrollments (
          protocol, name, cpf, birth_date, email, phone, city, course, shift,
          experience, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        protocol,
        data.name,
        data.cpf,
        data.birthDate,
        data.email,
        data.phone,
        data.city,
        data.course,
        data.shift,
        data.experience,
        data.message,
      );

    const insertHistory = database.prepare(
      `INSERT INTO enrollment_history (
        enrollment_id, action, description, author_email
      ) VALUES (
        last_insert_rowid(),
        'solicitacao',
        'Solicitação recebida pelo site com consentimento para uso dos dados no atendimento.',
        'site-publico'
      )`,
    );

    await database.batch([insertEnrollment, insertHistory]);

    return publicJson({ ok: true, protocol }, { status: 201 });
  } catch (error) {
    console.error("Enrollment creation failed", error);
    return publicJson(
      { error: "Não foi possível registrar a matrícula agora. Tente novamente." },
      { status: 500 },
    );
  }
}
