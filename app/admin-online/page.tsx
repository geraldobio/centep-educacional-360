import { desc } from "drizzle-orm";
import Link from "next/link";
import { chatGPTSignOutPath, isCentepAdminEmail, requireChatGPTUser } from "../chatgpt-auth";
import { Brand } from "../components/site-chrome";
import { getDb } from "../../db";
import { enrollments } from "../../db/schema";
import { EnrollmentManager, type EnrollmentRow } from "./enrollment-manager";

export const dynamic = "force-dynamic";

function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**` : "CPF protegido";
}

export default async function OnlineAdminPage() {
  const user = await requireChatGPTUser("/admin-online");

  if (!isCentepAdminEmail(user.email)) {
    return (
      <main className="online-access-denied">
        <h1>Acesso restrito</h1>
        <p>Este painel está disponível somente para administradores autorizados do CENTEP.</p>
        <a href={chatGPTSignOutPath("/")}>Sair desta conta</a>
      </main>
    );
  }

  const db = getDb();
  const rows = await db.select().from(enrollments).orderBy(desc(enrollments.createdAt), desc(enrollments.id)).limit(500);
  const safeRows: EnrollmentRow[] = rows.map((row) => ({
    id: row.id,
    protocol: row.protocol,
    name: row.name,
    cpfMasked: maskCpf(row.cpf),
    email: row.email,
    phone: row.phone,
    city: row.city,
    course: row.course,
    shift: row.shift,
    experience: row.experience,
    status: row.status,
    createdAt: row.createdAt,
  }));

  return (
    <main className="online-admin-page">
      <aside className="online-admin-sidebar">
        <Brand inverse />
        <div className="online-admin-nav-label">GESTÃO ONLINE</div>
        <nav>
          <a className="active" href="#matriculas"><span>MT</span>Matrículas</a>
          <Link href="/admin"><span>DB</span>Dashboard demonstrativo</Link>
          <Link href="/"><span>ST</span>Site institucional</Link>
        </nav>
        <div className="online-admin-account">
          <b>{user.displayName}</b>
          <small>{user.email}</small>
          <a href={chatGPTSignOutPath("/")}>Sair com segurança</a>
        </div>
      </aside>

      <section className="online-admin-main">
        <header className="online-admin-topbar"><div><small>CENTEP ANALYTICS</small><h1>Banco de Matrículas</h1></div><span>Dados sincronizados online</span></header>
        <div className="online-admin-content">
          <EnrollmentManager initialRows={safeRows} />
        </div>
      </section>
    </main>
  );
}
