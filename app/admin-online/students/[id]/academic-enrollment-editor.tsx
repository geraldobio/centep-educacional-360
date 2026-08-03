"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AcademicEnrollmentValue = {
  id: string;
  course: string;
  className: string;
  shift: string;
  status: string;
};

type AcademicEnrollmentEditorProps = {
  studentId: string;
  academicEnrollment: AcademicEnrollmentValue;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

const academicStatuses = [
  "Ativa",
  "Trancada",
  "Concluída",
  "Cancelada",
] as const;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function AcademicEnrollmentEditor({
  studentId,
  academicEnrollment,
}: AcademicEnrollmentEditorProps) {
  const router = useRouter();

  const [saved, setSaved] = useState(academicEnrollment);
  const [className, setClassName] = useState(academicEnrollment.className);
  const [shift, setShift] = useState(academicEnrollment.shift);
  const [status, setStatus] = useState(academicEnrollment.status);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const normalizedClassName = normalizeText(className);
  const normalizedShift = normalizeText(shift);

  const hasChanges = useMemo(
    () =>
      normalizedClassName !== saved.className ||
      normalizedShift !== saved.shift ||
      status !== saved.status,
    [
      normalizedClassName,
      normalizedShift,
      saved.className,
      saved.shift,
      saved.status,
      status,
    ],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (
      normalizedClassName.length < 2 ||
      normalizedClassName.length > 80
    ) {
      setFeedback({
        type: "error",
        message: "Informe uma turma válida, com 2 a 80 caracteres.",
      });
      return;
    }

    if (normalizedShift.length < 2 || normalizedShift.length > 40) {
      setFeedback({
        type: "error",
        message: "Informe um turno válido, com 2 a 40 caracteres.",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/students/${encodeURIComponent(studentId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academicEnrollmentId: saved.id,
            className: normalizedClassName,
            shift: normalizedShift,
            status,
          }),
        },
      );

      const result = (await response.json().catch(() => null)) as
        | {
            error?: string;
            unchanged?: boolean;
            academicEnrollment?: AcademicEnrollmentValue;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.error || "Não foi possível atualizar os dados acadêmicos.",
        );
      }

      const updated =
        result?.academicEnrollment || {
          ...saved,
          className: normalizedClassName,
          shift: normalizedShift,
          status,
        };

      setSaved(updated);
      setClassName(updated.className);
      setShift(updated.shift);
      setStatus(updated.status);

      setFeedback({
        type: "success",
        message: result?.unchanged
          ? "Nenhuma alteração acadêmica foi necessária."
          : "Dados acadêmicos atualizados com sucesso.",
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os dados acadêmicos.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="student-academic-editor" onSubmit={handleSubmit}>
      <header>
        <div>
          <h4>Atualizar vínculo acadêmico</h4>
          <p>As alterações serão registradas no histórico do candidato.</p>
        </div>
      </header>

      <div className="student-academic-editor-fields">
        <label>
          <span>Curso</span>
          <input
            aria-readonly="true"
            readOnly
            value={saved.course}
          />
        </label>

        <label>
          <span>Turma</span>
          <input
            required
            minLength={2}
            maxLength={80}
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          />
        </label>

        <label>
          <span>Turno</span>
          <input
            required
            minLength={2}
            maxLength={40}
            value={shift}
            onChange={(event) => setShift(event.target.value)}
          />
        </label>

        <label>
          <span>Situação</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {academicStatuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <footer className="student-academic-editor-actions">
        <div aria-live="polite">
          {feedback && (
            <p
              className={
                feedback.type === "success"
                  ? "student-editor-success"
                  : "student-editor-error"
              }
            >
              {feedback.message}
            </p>
          )}
        </div>

        <button disabled={!hasChanges || saving} type="submit">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </footer>
    </form>
  );
}