"use client";

import { DashboardShell, KpiCard, Panel } from "../components/dashboard-shell";

export default function TeacherPortal() {
  return (
    <DashboardShell role="teacher">
      <div className="dash-welcome">
        <div><h1>Bom dia, professor Marcos.</h1><p>Suas turmas, compromissos e pendências em um só lugar.</p></div>
        <span className="dash-date">Semana 29 · 4 turmas ativas</span>
      </div>
      <div className="kpi-grid">
        <KpiCard icon="TR" value="04" label="Turmas ativas" change="86 alunos" />
        <KpiCard icon="AL" value="12" label="Aulas nesta semana" change="3 hoje" />
        <KpiCard icon="FR" value="93%" label="Frequência média" change="+2%" />
        <KpiCard icon="PN" value="03" label="Pendências acadêmicas" change="Atenção" warning />
      </div>

      <div className="dashboard-grid">
        <Panel title="Agenda de hoje" action="Abrir calendário" id="agenda">
          <div className="lesson-list">
            <div className="lesson-item"><span className="lesson-time">14:00</span><div><strong>Alinhamento de Sistemas Sonoros</strong><small>Turma AS-26A · Laboratório principal</small></div><span className="status-pill blue">Em 1h</span></div>
            <div className="lesson-item"><span className="lesson-time">17:30</span><div><strong>Reunião pedagógica</strong><small>Coordenação · Sala 03</small></div><span className="status-pill">Confirmada</span></div>
            <div className="lesson-item"><span className="lesson-time">19:00</span><div><strong>Técnico e Operador de Som</strong><small>Turma TS-26N · Laboratório 02</small></div><span className="status-pill blue">Aula</span></div>
          </div>
        </Panel>

        <Panel title="Pendências" action="Resolver todas">
          <div className="activity-list">
            <div className="activity-item"><span className="activity-dot">NT</span><div><strong>Lançar notas</strong><span>Mixagem na Prática · 18 alunos</span></div></div>
            <div className="activity-item"><span className="activity-dot">FR</span><div><strong>Fechar frequência</strong><span>Alinhamento · aula de 15/07</span></div></div>
            <div className="activity-item"><span className="activity-dot">MT</span><div><strong>Publicar material</strong><span>Dinâmicos · módulo 03</span></div></div>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid">
        <Panel title="Desempenho das turmas" action="Ver relatórios" id="turmas">
          <div className="chart">
            {[78, 92, 85, 70, 88, 95].map((height, index) => <div key={index} className="chart-bar" style={{ height: `${height}%` }}><span>{["TS-A", "TS-N", "AS-A", "MP-N", "DN-A", "AS-N"][index]}</span></div>)}
          </div>
        </Panel>
        <Panel title="Atalhos rápidos">
          <div className="quick-grid">
            <a className="quick-action" href="#frequencia"><i>FR</i>Fazer chamada</a>
            <a className="quick-action" href="#avaliacoes"><i>NT</i>Lançar notas</a>
            <a className="quick-action" href="#materiais"><i>UP</i>Enviar material</a>
            <a className="quick-action" href="#turmas"><i>TR</i>Ver turmas</a>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
