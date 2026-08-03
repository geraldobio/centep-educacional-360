import {
  chatGPTSignOutPath,
  isCentepAdminEmail,
  requireChatGPTUser,
} from "../../chatgpt-auth";
import { getD1Database } from "../../../db";
import { AdminShell } from "../admin-shell";
import {
  studentListSql,
  type StudentListRecord,
} from "./student-list-query";
import {
  StudentManager,
  type StudentRow,
} from "./student-manager";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
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

  const result = await getD1Database()
    .prepare(studentListSql)
    .all<StudentListRecord>();

  const records = (result.results ?? []) as StudentListRecord[];

  const safeRows: StudentRow[] = records.map((row) => ({
    studentId: row.student_id,
    sourceEnrollmentId: row.source_enrollment_id,
    registrationNumber: row.registration_number,
    name: row.name,
    course: row.course,
    className: row.class_name,
    shift: row.shift,
    status: row.status,
    enrolledAt: row.enrolled_at,
  }));

  return (
    <AdminShell
      active="students"
      title="Gestão de Alunos"
      user={user}
    >
      <StudentManager initialRows={safeRows} />
    </AdminShell>
  );
}