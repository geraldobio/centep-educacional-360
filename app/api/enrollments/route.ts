import { getD1Database } from "../../../db";

type EnrollmentPayload = {
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  city?: string;
  course?: string;
  shift?: string;
  experience?: string;
  message?: string;
  website?: string;
  consent?: string;
};

const MAX_REQUEST_BYTES = 16_384;
const courses = new Set([
  "Técnico e Operador de Som",
  "Alinhamento de Sistemas Sonoros",
  "Mixagem na Prática",
  "Dinâmicos",
]);
const shifts = new Set(["Manhã", "Tarde", "Noite", "Final de semana"]);
const experiences = new Set([
  "Estou começando agora",
  "Tenho experiência básica",
  "Já trabalho na área",
  "Busco especialização",
]);

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function publicJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}

function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  return date.getTime() <= Date.now();
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
    payload = JSON.parse(rawBody) as EnrollmentPayload;
  } catch {
    return publicJson({ error: "Dados inválidos." }, { status: 400 });
  }

  if (clean(payload.website)) {
    return publicJson({ ok: true }, { status: 201 });
  }

  const data = {
    name: clean(payload.name, 120),
    cpf: clean(payload.cpf, 14).replace(/\D/g, ""),
    birthDate: clean(payload.birthDate, 10),
    email: clean(payload.email, 160).toLowerCase(),
    phone: clean(payload.phone, 20),
    city: clean(payload.city, 100),
    course: clean(payload.course, 100),
    shift: clean(payload.shift, 40),
    experience: clean(payload.experience, 80) || "Estou começando agora",
    message: clean(payload.message, 1000),
    consentAccepted: clean(payload.consent, 20) === "accepted",
  };

  if (
    data.name.length < 4 ||
    !isValidCpf(data.cpf) ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    data.phone.replace(/\D/g, "").length < 10 ||
    !isValidBirthDate(data.birthDate) ||
    !data.city ||
    !courses.has(data.course) ||
    !shifts.has(data.shift) ||
    !experiences.has(data.experience) ||
    !data.consentAccepted
  ) {
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
