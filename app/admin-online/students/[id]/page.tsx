import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  chatGPTSignOutPath,
  isCentepAdminEmail,
  requireChatGPTUser,
} from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import {
  academicEnrollments,
  enrollments,
  students,
} from "../../../../db/schema";
import { AdminShell } from "../../admin-shell";
import { AcademicEnrollmentEditor } from "./academic-enrollment-editor";

export const dynamic = "force-dynamic";

type StudentDetailPageProps = {
  params: Promise<{ id: string }>;
};

function isStudentId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");

  return digits.length === 11
    ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
    : "CPF protegido";
}

function formatBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null) {
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function statusClassName(status: string) {
  const normalized = normalize(status).replace(/\s+/g, "-");

  if (normalized === "ativa") return "student-status-active";
  if (normalized === "concluida") return "student-status-completed";
  if (normalized === "trancada") return "student-status-paused";
  if (normalized === "cancelada") return "student-status-cancelled";

  return "student-status-default";
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const user = await requireChatGPTUser("/admin-online/students");

  if (!isCentepAdminEmail(user.email)) {
    return (
      <main className="online-access-denied">
        <h1>Acesso restrito</h1>
        <p>
          Este painel está disponível somente para administradores autorizados
          do CENTEP.
        </p>
        <a href={chatGPTSignOutPath("/")}>Sair desta conta</a>
      </main>
    );
  }

  const { id: studentId } = await params;

  if (!isStudentId(studentId)) {
    notFound();
  }

  const db = getDb();

  const rows = await db
    .select({
      studentId: students.id,
      sourceEnrollmentId: students.sourceEnrollmentId,
      registrationNumber: students.registrationNumber,
      studentCreatedAt: students.createdAt,

      protocol: enrollments.protocol,
      name: enrollments.name,
      cpf: enrollments.cpf,
      birthDate: enrollments.birthDate,
      email: enrollments.email,
      phone: enrollments.phone,
      city: enrollments.city,
      candidateStatus: enrollments.status,

      academicEnrollmentId: academicEnrollments.id,
      course: academicEnrollments.course,
      className: academicEnrollments.className,
      shift: academicEnrollments.shift,
      academicStatus: academicEnrollments.status,
      enrolledAt: academicEnrollments.enrolledAt,
      academicUpdatedAt: academicEnrollments.updatedAt,
    })
    .from(students)
    .innerJoin(
      enrollments,
      eq(students.sourceEnrollmentId, enrollments.id),
    )
    .leftJoin(
      academicEnrollments,
      eq(academicEnrollments.studentId, students.id),
    )
    .where(eq(students.id, studentId))
    .orderBy(desc(academicEnrollments.enrolledAt))
    .limit(50);

  if (rows.length === 0) {
    notFound();
  }

  const student = rows[0];
  const academicRows = rows.filter(
    (row) => row.academicEnrollmentId !== null,
  );

  return (
    <AdminShell
      active="students"
      title="Ficha Acadêmica"
      user={user}
    >
      <section className="student-detail-page">
        <Link
          className="student-detail-back"
          href="/admin-online/students"
        >
          ← Voltar para alunos
        </Link>

        <header className="student-detail-hero">
          <div>
            <small>FICHA ACADÊMICA</small>
            <h2>{student.name}</h2>
            <p>{student.registrationNumber}</p>
          </div>

          <span
            className={`student-status ${statusClassName(
              student.academicStatus || "",
            )}`}
          >
            {student.academicStatus || "Sem vínculo ativo"}
          </span>
        </header>

        <div className="student-detail-grid">
          <article className="student-detail-card">
            <div className="student-detail-card-title">
              <span>01</span>
              <div>
                <h3>Dados do aluno</h3>
                <p>Informações pessoais protegidas.</p>
              </div>
            </div>

            <dl className="student-detail-fields">
              <div>
                <dt>Nome completo</dt>
                <dd>{student.name}</dd>
              </div>

              <div>
                <dt>CPF</dt>
                <dd>{maskCpf(student.cpf)}</dd>
              </div>

              <div>
                <dt>Nascimento</dt>
                <dd>{formatBirthDate(student.birthDate)}</dd>
              </div>

              <div>
                <dt>Cidade</dt>
                <dd>{student.city}</dd>
              </div>

              <div>
                <dt>E-mail</dt>
                <dd>{student.email}</dd>
              </div>

              <div>
                <dt>Telefone</dt>
                <dd>{student.phone}</dd>
              </div>
            </dl>
          </article>

          <article className="student-detail-card">
            <div className="student-detail-card-title">
              <span>02</span>
              <div>
                <h3>Identificação acadêmica</h3>
                <p>Origem e criação da ficha.</p>
              </div>
            </div>

            <dl className="student-detail-fields">
              <div>
                <dt>Número de matrícula</dt>
                <dd>{student.registrationNumber}</dd>
              </div>

              <div>
                <dt>Protocolo de origem</dt>
                <dd>{student.protocol}</dd>
              </div>

              <div>
                <dt>Status do candidato</dt>
                <dd>{student.candidateStatus}</dd>
              </div>

              <div>
                <dt>Ficha criada em</dt>
                <dd>{formatDateTime(student.studentCreatedAt)}</dd>
              </div>
            </dl>
          </article>
        </div>

        <article className="student-detail-card">
          <div className="student-detail-card-title">
            <span>03</span>
            <div>
              <h3>Vínculos acadêmicos</h3>
              <p>Cursos e turmas associados ao aluno.</p>
            </div>
          </div>

          <div className="student-academic-list">
            {academicRows.map((row) => (
              <article
                className="student-academic-record"
                key={row.academicEnrollmentId}
              >
                <section className="student-academic-item">
                  <div>
                    <small>Curso</small>
                    <strong>{row.course}</strong>
                  </div>

                  <div>
                    <small>Turma</small>
                    <strong>{row.className}</strong>
                  </div>

                  <div>
                    <small>Turno</small>
                    <strong>{row.shift}</strong>
                  </div>

                  <div>
                    <small>Situação</small>
                    <span
                      className={`student-status ${statusClassName(
                        row.academicStatus || "",
                      )}`}
                    >
                      {row.academicStatus}
                    </span>
                  </div>

                  <div>
                    <small>Matrícula</small>
                    <strong>{formatDateTime(row.enrolledAt)}</strong>
                  </div>

                  <div>
                    <small>Última atualização</small>
                    <strong>{formatDateTime(row.academicUpdatedAt)}</strong>
                  </div>
                </section>

                <AcademicEnrollmentEditor
                  studentId={student.studentId}
                  academicEnrollment={{
                    id: row.academicEnrollmentId!,
                    course: row.course!,
                    className: row.className!,
                    shift: row.shift!,
                    status: row.academicStatus!,
                  }}
                />
              </article>
            ))}

            {academicRows.length === 0 && (
              <p className="students-empty">
                Nenhum vínculo acadêmico encontrado.
              </p>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}