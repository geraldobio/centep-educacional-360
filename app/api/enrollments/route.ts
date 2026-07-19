import { getDb } from "../../../db";
import { enrollments } from "../../../db/schema";

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
};

const courses = new Set([
  "Técnico e Operador de Som",
  "Alinhamento de Sistemas Sonoros",
  "Mixagem na Prática",
  "Dinâmicos",
]);

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EnrollmentPayload;
    if (clean(payload.website)) {
      return Response.json({ ok: true }, { status: 201 });
    }

    const data = {
      name: clean(payload.name, 120),
      cpf: clean(payload.cpf, 14),
      birthDate: clean(payload.birthDate, 10),
      email: clean(payload.email, 160).toLowerCase(),
      phone: clean(payload.phone, 20),
      city: clean(payload.city, 100),
      course: clean(payload.course, 100),
      shift: clean(payload.shift, 40),
      experience: clean(payload.experience, 80) || "Iniciante",
      message: clean(payload.message, 1000),
    };

    if (
      data.name.length < 4 ||
      data.cpf.replace(/\D/g, "").length !== 11 ||
      !/^\S+@\S+\.\S+$/.test(data.email) ||
      data.phone.replace(/\D/g, "").length < 10 ||
      !data.birthDate ||
      !data.city ||
      !courses.has(data.course) ||
      !data.shift
    ) {
      return Response.json(
        { error: "Confira os campos obrigatórios e tente novamente." },
        { status: 400 },
      );
    }

    const protocol = `CENTEP-${new Date().getUTCFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    const db = getDb();
    await db.insert(enrollments).values({ protocol, ...data });

    return Response.json({ ok: true, protocol }, { status: 201 });
  } catch (error) {
    console.error("Enrollment creation failed", error);
    return Response.json(
      { error: "Não foi possível registrar a matrícula agora. Tente novamente." },
      { status: 500 },
    );
  }
}
