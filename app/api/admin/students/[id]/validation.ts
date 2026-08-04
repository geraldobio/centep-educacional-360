export type AcademicUpdatePayload = {
  academicEnrollmentId?: unknown;
  className?: unknown;
  shift?: unknown;
  status?: unknown;
};

export type NormalizedAcademicUpdate = {
  academicEnrollmentId: string;
  className: string;
  shift: string;
  status: string;
};

export type CurrentAcademicValues = {
  course: string;
  className: string;
  shift: string;
  status: string;
};

export type AcademicEnrollmentResponse = {
  id: string;
  course: string;
  className: string;
  shift: string;
  status: string;
};

export type AcademicUpdatePlan =
  | {
      unchanged: true;
      description: null;
      academicEnrollment: AcademicEnrollmentResponse;
    }
  | {
      unchanged: false;
      description: string;
      academicEnrollment: AcademicEnrollmentResponse;
    };

const academicStatuses = new Set([
  "Ativa",
  "Trancada",
  "Concluída",
  "Cancelada",
]);

export function isAcademicUpdatePayload(
  value: unknown,
): value is AcademicUpdatePayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function normalizeAcademicText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeAcademicUpdatePayload(
  payload: AcademicUpdatePayload,
): NormalizedAcademicUpdate {
  return {
    academicEnrollmentId: normalizeAcademicText(
      payload.academicEnrollmentId,
    ),
    className: normalizeAcademicText(payload.className),
    shift: normalizeAcademicText(payload.shift),
    status: normalizeAcademicText(payload.status),
  };
}

export function isValidAcademicText(
  value: string,
  minimum: number,
  maximum: number,
) {
  return (
    value.length >= minimum &&
    value.length <= maximum &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

export function validateAcademicUpdate(
  data: NormalizedAcademicUpdate,
): string | null {
  if (!isUuid(data.academicEnrollmentId)) {
    return "Vínculo acadêmico inválido.";
  }

  if (!isValidAcademicText(data.className, 2, 80)) {
    return "Informe uma turma válida, com 2 a 80 caracteres.";
  }

  if (!isValidAcademicText(data.shift, 2, 40)) {
    return "Informe um turno válido, com 2 a 40 caracteres.";
  }

  if (!academicStatuses.has(data.status)) {
    return "Situação acadêmica inválida.";
  }

  return null;
}

export function buildAcademicUpdate(
  current: CurrentAcademicValues,
  requested: NormalizedAcademicUpdate,
): AcademicUpdatePlan {
  const changes: string[] = [];

  if (current.className !== requested.className) {
    changes.push(
      `turma de "${current.className}" para "${requested.className}"`,
    );
  }

  if (current.shift !== requested.shift) {
    changes.push(`turno de "${current.shift}" para "${requested.shift}"`);
  }

  if (current.status !== requested.status) {
    changes.push(
      `situação de "${current.status}" para "${requested.status}"`,
    );
  }

  const academicEnrollment: AcademicEnrollmentResponse = {
    id: requested.academicEnrollmentId,
    course: current.course,
    className: requested.className,
    shift: requested.shift,
    status: requested.status,
  };

  if (changes.length === 0) {
    return {
      unchanged: true,
      description: null,
      academicEnrollment,
    };
  }

  return {
    unchanged: false,
    description: `Dados acadêmicos atualizados: ${changes.join("; ")}.`,
    academicEnrollment,
  };
}