"use client";

import Link from "next/link";
import { DashboardShell, KpiCard, Panel } from "../components/dashboard-shell";

const enrollments = [
  ["Amanda Costa", "Técnico e Operador", "Hoje, 09:42", "Em análise"],
  ["Lucas Menezes", "Mixagem na Prática", "Hoje, 08:15", "Confirmada"],
  ["Bruna Ferreira", "Alinhamento", "Ontem, 17:30", "Pendente"],
  ["Caio Ribeiro", "Dinâmicos", "Ontem, 15:12", "Confirmada"],
];

export default function AdminPortal() {
  return (
    <DashboardShell role="admin">
      <div className="dash-welcome">
        <div><h1>Visão geral da instituição.</h1><p>Indicadores acadêmicos e operacionais atualizados.</p></div>
        <Link className="dash-date" href="/admin-online">Abrir banco online →</Link>
      </div>
      <div className="kpi-grid">
        <KpiCard icon="AL" value="248" label="Alunos ativos" change="+12 este mês" />
        <KpiCard icon="MT" value="32" label="Novas matrículas" change="+18%" />
        <KpiCard icon="CR" value="04" label="Cursos ativos" change="11 turmas" />
        <KpiCard icon="RC" value="94%" label="Taxa de adimplência" change="+3%" />
      </div>

      <div className="dashboard-grid">
        <Panel title="Matrículas nos últimos meses" action="Exportar relatório" id="relatorios">
          <div className="chart">
            {[42, 58, 54, 72, 64, 88, 76, 96].map((height, index) => <div key={index} className="chart-bar" style={{ height: `${height}%` }}><span>{["DEZ", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL"][index]}</span></div>)}
          </div>
        </Panel>
        <Panel title="Atalhos de gestão">
          <div className="quick-grid">
            <a className="quick-action" href="#matriculas"><i>+</i>Nova matrícula</a>
            <a className="quick-action" href="#alunos"><i>AL</i>Cadastrar aluno</a>
            <a className="quick-action" href="#cursos"><i>TR</i>Abrir turma</a>
            <a className="quick-action" href="#relatorios"><i>RP</i>Gerar relatório</a>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid">
        <Panel title="Matrículas recentes" action="Ver todas" id="matriculas">
          <div className="table-list">
            {enrollments.map(([name, course, date, status]) => (
              <div className="table-row" key={name}><strong>{name}</strong><span>{course}</span><span>{date}</span><span className={`status-pill ${status === "Confirmada" ? "" : status === "Pendente" ? "gold" : "blue"}`}>{status}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Operação hoje" action="Ver agenda">
          <div className="activity-list">
            <div className="activity-item"><span className="activity-dot">08</span><div><strong>Aulas programadas</strong><span>4 laboratórios em uso</span></div></div>
            <div className="activity-item"><span className="activity-dot">14</span><div><strong>Solicitações abertas</strong><span>Secretaria e financeiro</span></div></div>
            <div className="activity-item"><span className="activity-dot">03</span><div><strong>Certificados pendentes</strong><span>Aguardando validação</span></div></div>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
