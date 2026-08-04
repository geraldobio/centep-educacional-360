"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type StudentRow = {
  studentId: string;
  sourceEnrollmentId: number;
  registrationNumber: string;
  name: string;
  course: string;
  className: string;
  shift: string;
  status: string;
  enrolledAt: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDateTime(value: string) {
  if (!value) return "—";

  const parsed = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(parsed);
}

function statusClassName(status: string) {
  const normalized = normalize(status).replace(/\s+/g, "-");

  if (normalized === "ativa") return "student-status-active";
  if (normalized === "concluida") return "student-status-completed";
  if (normalized === "trancada") return "student-status-paused";
  if (normalized === "cancelada") return "student-status-cancelled";

  return "student-status-default";
}

export function StudentManager({
  initialRows,
}: {
  initialRows: StudentRow[];
}) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const courses = useMemo(
    () =>
      Array.from(new Set(initialRows.map((row) => row.course)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [initialRows],
  );

  const statuses = useMemo(
    () =>
      Array.from(new Set(initialRows.map((row) => row.status)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [initialRows],
  );

  const filteredRows = useMemo(() => {
    const term = normalize(search.trim());

    return initialRows.filter((row) => {
      const searchable = normalize(
        [
          row.name,
          row.registrationNumber,
          row.course,
          row.className,
          row.shift,
          row.status,
        ].join(" "),
      );

      return (
        (!term || searchable.includes(term)) &&
        (courseFilter === "Todos" || row.course === courseFilter) &&
        (statusFilter === "Todos" || row.status === statusFilter)
      );
    });
  }, [courseFilter, initialRows, search, statusFilter]);

  const activeCount = initialRows.filter(
    (row) => normalize(row.status) === "ativa",
  ).length;

  const classCount = new Set(
    initialRows.map((row) => `${row.course}::${row.className}`),
  ).size;

  return (
    <section
      className="student-management"
      aria-labelledby="students-heading"
    >
      <div className="student-summary-grid">
        <article className="student-summary-card">
          <small>Total de alunos</small>
          <strong>{initialRows.length}</strong>
          <span>Fichas acadêmicas cadastradas</span>
        </article>

        <article className="student-summary-card">
          <small>Matrículas ativas</small>
          <strong>{activeCount}</strong>
          <span>Alunos com vínculo ativo</span>
        </article>

        <article className="student-summary-card">
          <small>Turmas</small>
          <strong>{initialRows.length ? classCount : 0}</strong>
          <span>Combinações de curso e turma</span>
        </article>

        <article className="student-summary-card">
          <small>Banco acadêmico</small>
          <strong className="student-summary-status">ATIVO</strong>
          <span>Dados armazenados no D1</span>
        </article>
      </div>

      <div className="students-panel">
        <header className="students-panel-header">
          <div>
            <h2 id="students-heading">Alunos cadastrados</h2>
            <p>
              Consulte matrículas, cursos, turmas, turnos e situações
              acadêmicas.
            </p>
          </div>

          <span>{filteredRows.length} resultado(s)</span>
        </header>

        <div className="students-filters">
          <input
            aria-label="Buscar aluno"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, matrícula, curso ou turma"
          />

          <select
            aria-label="Filtrar por curso"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          >
            <option value="Todos">Todos os cursos</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por situação"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="Todos">Todas as situações</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="students-table-wrap">
          <table className="students-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Matrícula</th>
                <th>Curso</th>
                <th>Turma</th>
                <th>Turno</th>
                <th>Situação</th>
                <th>Data da matrícula</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.studentId}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>
                    <code>{row.registrationNumber}</code>
                  </td>
                  <td>{row.course}</td>
                  <td>{row.className}</td>
                  <td>{row.shift}</td>
                  <td>
                    <span
                      className={`student-status ${statusClassName(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{formatDateTime(row.enrolledAt)}</td>
                  <td>
                    <Link
                      className="student-row-action"
                      href={`/admin-online/students/${row.studentId}`}
                    >
                      Abrir ficha
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td className="students-empty" colSpan={8}>
                    {initialRows.length === 0
                      ? "Nenhum aluno cadastrado até o momento."
                      : "Nenhum aluno corresponde aos filtros informados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}