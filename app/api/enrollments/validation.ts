export type EnrollmentPayload = {
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

export type NormalizedEnrollmentData = {
  name: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  city: string;
  course: string;
  shift: string;
  experience: string;
  message: string;
  consentAccepted: boolean;
};

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

export function cleanEnrollmentValue(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isEnrollmentPayload(value: unknown): value is EnrollmentPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeEnrollmentPayload(
  payload: EnrollmentPayload,
): NormalizedEnrollmentData {
  return {
    name: cleanEnrollmentValue(payload.name, 120),
    cpf: cleanEnrollmentValue(payload.cpf, 14).replace(/\D/g, ""),
    birthDate: cleanEnrollmentValue(payload.birthDate, 10),
    email: cleanEnrollmentValue(payload.email, 160).toLowerCase(),
    phone: cleanEnrollmentValue(payload.phone, 20),
    city: cleanEnrollmentValue(payload.city, 100),
    course: cleanEnrollmentValue(payload.course, 100),
    shift: cleanEnrollmentValue(payload.shift, 40),
    experience:
      cleanEnrollmentValue(payload.experience, 80) || "Estou começando agora",
    message: cleanEnrollmentValue(payload.message, 1000),
    consentAccepted: cleanEnrollmentValue(payload.consent, 20) === "accepted",
  };
}

export function isValidCpf(cpf: string) {
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

export function isValidBirthDate(value: string, now = Date.now()) {
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
  return date.getTime() <= now;
}

export function isValidEnrollmentData(
  data: NormalizedEnrollmentData,
  now = Date.now(),
) {
  return (
    data.name.length >= 4 &&
    isValidCpf(data.cpf) &&
    /^\S+@\S+\.\S+$/.test(data.email) &&
    data.phone.replace(/\D/g, "").length >= 10 &&
    isValidBirthDate(data.birthDate, now) &&
    Boolean(data.city) &&
    courses.has(data.course) &&
    shifts.has(data.shift) &&
    experiences.has(data.experience) &&
    data.consentAccepted
  );
}
