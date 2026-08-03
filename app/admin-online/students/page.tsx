import { desc, eq } from "drizzle-orm";
import {
  chatGPTSignOutPath,
  isCentepAdminEmail,
  requireChatGPTUser,
} from "../../chatgpt-auth";
import { getDb } from "../../../db";
import {
  academicEnrollments,
  enrollments,
  students,
} from "../../../db/schema";
import { AdminShell } from "../admin-shell";
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

  const db = getDb();

  const rows = await db
    .select({
      studentId: students.id,
      sourceEnrollmentId: students.sourceEnrollmentId,
      registrationNumber: students.registrationNumber,
      name: enrollments.name,
      course: academicEnrollments.course,
      className: academicEnrollments.className,
      shift: academicEnrollments.shift,
      status: academicEnrollments.status,
      enrolledAt: academicEnrollments.enrolledAt,
    })
    .from(students)
    .innerJoin(
      enrollments,
      eq(students.sourceEnrollmentId, enrollments.id),
    )
    .innerJoin(
      academicEnrollments,
      eq(academicEnrollments.studentId, students.id),
    )
    .orderBy(
      desc(academicEnrollments.enrolledAt),
      desc(students.createdAt),
    )
    .limit(500);

  const safeRows: StudentRow[] = rows.map((row) => ({
    studentId: row.studentId,
    sourceEnrollmentId: row.sourceEnrollmentId,
    registrationNumber: row.registrationNumber,
    name: row.name,
    course: row.course,
    className: row.className,
    shift: row.shift,
    status: row.status,
    enrolledAt: row.enrolledAt,
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