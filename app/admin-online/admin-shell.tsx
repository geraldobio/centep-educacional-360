import type { ReactNode } from "react";
import Link from "next/link";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import { Brand } from "../components/site-chrome";

type AdminShellProps = {
  active: "enrollments" | "students";
  title: string;
  user: {
    displayName: string;
    email: string;
  };
  children: ReactNode;
};

export function AdminShell({
  active,
  title,
  user,
  children,
}: AdminShellProps) {
  return (
    <main className="online-admin-page">
      <aside className="online-admin-sidebar">
        <Brand inverse />

        <div className="online-admin-nav-label">GESTÃO ONLINE</div>

        <nav>
  <a
    className={active === "enrollments" ? "active" : undefined}
    href="/admin-online"
  >
    <span>MT</span>
    Matrículas
  </a>

  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Cloudflare Access exige navegação completa nesta rota protegida. */}
  <a
    className={active === "students" ? "active" : undefined}
    href="/admin-online/students"
  >
    <span>AL</span>
    Alunos
  </a>

          <Link href="/admin">
            <span>DB</span>
            Dashboard demonstrativo
          </Link>

          <Link href="/">
            <span>ST</span>
            Site institucional
          </Link>
        </nav>

        <div className="online-admin-account">
          <b>{user.displayName}</b>
          <small>{user.email}</small>
          <a href={chatGPTSignOutPath("/")}>Sair com segurança</a>
        </div>
      </aside>

      <section className="online-admin-main">
        <header className="online-admin-topbar">
          <div>
            <small>CENTEP ANALYTICS</small>
            <h1>{title}</h1>
          </div>

          <span>Dados sincronizados online</span>
        </header>

        <div className="online-admin-content">{children}</div>
      </section>
    </main>
  );
}