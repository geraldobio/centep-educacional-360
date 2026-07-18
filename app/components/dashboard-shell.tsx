"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Brand } from "./site-chrome";
import { clearDemoSession, DemoRole, DemoSession, readDemoSession } from "../lib/demo-auth";

type NavItem = { icon: string; label: string; href: string; active?: boolean };

const roleNavigation: Record<DemoRole, { section: string; items: NavItem[] }[]> = {
  student: [
    { section: "Visão geral", items: [{ icon: "IN", label: "Início", href: "/portal-aluno", active: true }, { icon: "CR", label: "Meus cursos", href: "#curso" }, { icon: "AG", label: "Agenda", href: "#agenda" }] },
    { section: "Acadêmico", items: [{ icon: "NT", label: "Notas e frequência", href: "#desempenho" }, { icon: "BL", label: "Biblioteca", href: "#biblioteca" }, { icon: "CT", label: "Certificados", href: "#certificados" }] },
    { section: "Conta", items: [{ icon: "FN", label: "Financeiro", href: "#financeiro" }, { icon: "PF", label: "Meu perfil", href: "#perfil" }] },
  ],
  teacher: [
    { section: "Visão geral", items: [{ icon: "IN", label: "Início", href: "/portal-professor", active: true }, { icon: "TR", label: "Minhas turmas", href: "#turmas" }, { icon: "AG", label: "Agenda", href: "#agenda" }] },
    { section: "Acadêmico", items: [{ icon: "DR", label: "Diário de classe", href: "#diario" }, { icon: "FR", label: "Frequência", href: "#frequencia" }, { icon: "AV", label: "Avaliações", href: "#avaliacoes" }, { icon: "MT", label: "Materiais", href: "#materiais" }] },
  ],
  admin: [
    { section: "Gestão", items: [{ icon: "IN", label: "Dashboard", href: "/admin", active: true }, { icon: "AL", label: "Alunos", href: "#alunos" }, { icon: "MT", label: "Matrículas", href: "#matriculas" }, { icon: "CR", label: "Cursos e turmas", href: "#cursos" }] },
    { section: "Operação", items: [{ icon: "PR", label: "Professores", href: "#professores" }, { icon: "FN", label: "Financeiro", href: "#financeiro" }, { icon: "CT", label: "Certificados", href: "#certificados" }, { icon: "RP", label: "Relatórios", href: "#relatorios" }] },
  ],
};

const fallbacks: Record<DemoRole, DemoSession> = {
  student: { role: "student", name: "Geraldo Santos", email: "aluno@centep.com.br" },
  teacher: { role: "teacher", name: "Marcos Almeida", email: "professor@centep.com.br" },
  admin: { role: "admin", name: "Administração CENTEP", email: "admin@centep.com.br" },
};

export function DashboardShell({ role, children }: { role: DemoRole; children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const current = readDemoSession();
    if (!current || current.role !== role) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setReady(true);
  }, [role, router]);

  const logout = () => {
    clearDemoSession();
    router.push("/login");
  };

  if (!ready || !session) return <div className="empty-guard">Preparando seu ambiente CENTEP…</div>;

  const name = session.name || fallbacks[role].name;
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("");

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <aside className={`dash-sidebar ${menuOpen ? "open" : ""}`}>
          <Brand inverse />
          <nav className="dash-nav">
            {roleNavigation[role].map((group) => (
              <div key={group.section}>
                <div className="dash-nav-label">{group.section}</div>
                {group.items.map((item) => (
                  <Link key={item.label} className={item.active ? "active" : ""} href={item.href} onClick={() => setMenuOpen(false)}><span className="dash-nav-icon">{item.icon}</span><span>{item.label}</span></Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-user"><span className="user-avatar">{initials}</span><div><strong>{name}</strong><span>{session.email}</span></div><button className="logout-button" onClick={logout} title="Sair">↗</button></div>
        </aside>

        <div className="dash-main">
          <header className="dash-topbar">
            <button className="mobile-dash-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>
            <div className="dash-search"><span>⌕</span><span>Buscar no CENTEP 360</span></div>
            <div className="dash-top-actions">
              <button className="top-icon" aria-label="Notificações">○</button>
              <div className="top-user"><span className="user-avatar">{initials}</span><div><strong>{name}</strong><span>{role === "student" ? "Aluno" : role === "teacher" ? "Professor" : "Administrador"}</span></div></div>
            </div>
          </header>
          <div className="dash-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function KpiCard({ icon, value, label, change, warning = false }: { icon: string; value: string; label: string; change: string; warning?: boolean }) {
  return <article className="kpi-card"><div className="kpi-card-header"><span className="kpi-icon">{icon}</span><span className={`kpi-change ${warning ? "warn" : ""}`}>{change}</span></div><strong>{value}</strong><span>{label}</span></article>;
}

export function Panel({ title, action, children, id }: { title: string; action?: string; children: ReactNode; id?: string }) {
  return <section className="panel" id={id}><div className="panel-header"><h2>{title}</h2>{action && <button>{action}</button>}</div>{children}</section>;
}
