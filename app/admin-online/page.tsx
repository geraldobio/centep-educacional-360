import { desc } from "drizzle-orm";
import Link from "next/link";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { Brand } from "../components/site-chrome";
import { getDb } from "../../db";
import { enrollments } from "../../db/schema";

export const dynamic = "force-dynamic";

const allowedAdminEmails = new Set(["geraldo.bio@gmail.com"]);

function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**` : "CPF protegido";
}

export default async function OnlineAdminPage() {
  const user = await requireChatGPTUser("/admin-online");

  if (!allowedAdminEmails.has(user.email.toLowerCase())) {
    return (
      <main className="online-access-denied">
        <h1>Acesso restrito</h1>
        <p>Este painel está disponível somente para administradores autorizados do CENTEP.</p>
        <a href={chatGPTSignOutPath("/")}>Sair desta conta</a>
      </main>
    );
  }

  const db = getDb();
  const rows = await db.select().from(enrollments).orderBy(desc(enrollments.createdAt), desc(enrollments.id)).limit(100);
  const newCount = rows.filter((row) => row.status === "Nova").length;

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
          <div className="online-admin-kpis">
            <article><span>Solicitações</span><strong>{rows.length}</strong><small>Total registrado</small></article>
            <article><span>Novas</span><strong>{newCount}</strong><small>Aguardando contato</small></article>
            <article><span>Cursos</span><strong>{new Set(rows.map((row) => row.course)).size}</strong><small>Com interessados</small></article>
            <article><span>Banco</span><strong className="online-status">ATIVO</strong><small>Armazenamento central</small></article>
          </div>

          <section className="online-admin-panel" id="matriculas">
            <div className="online-admin-panel-head"><div><h2>Solicitações recebidas</h2><p>Dados enviados pelo formulário público de matrícula.</p></div><Link href="/matricula">+ Nova matrícula</Link></div>
            {rows.length ? (
              <div className="online-admin-table-wrap">
                <table className="online-admin-table">
                  <thead><tr><th>Candidato</th><th>Curso</th><th>Contato</th><th>Disponibilidade</th><th>Protocolo</th><th>Status</th></tr></thead>
                  <tbody>{rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong><small>{row.city} • {maskCpf(row.cpf)}</small></td>
                      <td>{row.course}</td>
                      <td><strong>{row.phone}</strong><small>{row.email}</small></td>
                      <td>{row.shift}<small>{row.experience}</small></td>
                      <td><code>{row.protocol}</code><small>{row.createdAt}</small></td>
                      <td><span className="online-status-pill">{row.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : (
              <div className="online-admin-empty"><span>MT</span><h3>Nenhuma matrícula recebida ainda.</h3><p>Assim que um candidato enviar o formulário, os dados aparecerão aqui.</p><Link className="button button-primary" href="/matricula">Abrir formulário</Link></div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
