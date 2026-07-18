"use client";

import { DashboardShell, KpiCard, Panel } from "../components/dashboard-shell";

export default function StudentPortal() {
  return (
    <DashboardShell role="student">
      <div className="dash-welcome">
        <div><h1>Olá, Geraldo! 👋</h1><p>Acompanhe sua jornada e continue de onde parou.</p></div>
        <span className="dash-date">Turma 2026.2 · Noturno</span>
      </div>
      <div className="kpi-grid">
        <KpiCard icon="PG" value="68%" label="Progresso da formação" change="+8% este mês" />
        <KpiCard icon="FR" value="92%" label="Frequência geral" change="Dentro da meta" />
        <KpiCard icon="NT" value="8,7" label="Média acadêmica" change="+0,4" />
        <KpiCard icon="CT" value="01" label="Certificado disponível" change="Novo" warning />
      </div>

      <div className="dashboard-grid">
        <Panel title="Formação em andamento" action="Ver detalhes" id="curso">
          <div className="progress-course">
            <div className="progress-course-head"><span>TS</span><div><strong>Técnico e Operador de Som</strong><small>Módulo 4 de 6 · Sistemas e operação</small></div><em>68%</em></div>
            <div className="progress-track"><i style={{ width: "68%" }} /></div>
            <div className="progress-meta"><span>34 de 50 aulas concluídas</span><span>Próxima: Estrutura de ganho</span></div>
          </div>
          <div className="lesson-list">
            <div className="lesson-item"><span className="lesson-time">19:00</span><div><strong>Estrutura de ganho na prática</strong><small>Hoje · Laboratório 02</small></div><span className="status-pill blue">Próxima aula</span></div>
            <div className="lesson-item"><span className="lesson-time">19:00</span><div><strong>Equalização corretiva</strong><small>Quinta-feira · Laboratório 01</small></div><span className="status-pill">Confirmada</span></div>
          </div>
        </Panel>

        <Panel title="Atividade recente" action="Ver tudo">
          <div className="activity-list">
            <div className="activity-item"><span className="activity-dot">OK</span><div><strong>Avaliação concluída</strong><span>Fundamentos de áudio · nota 9,2</span></div></div>
            <div className="activity-item"><span className="activity-dot">PDF</span><div><strong>Novo material disponível</strong><span>Checklist de passagem de som</span></div></div>
            <div className="activity-item"><span className="activity-dot">CT</span><div><strong>Certificado liberado</strong><span>Segurança e boas práticas</span></div></div>
            <div className="activity-item"><span className="activity-dot">AV</span><div><strong>Comunicado da coordenação</strong><span>Aula prática confirmada para sábado</span></div></div>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid">
        <Panel title="Próximas atividades" action="Abrir agenda" id="agenda">
          <div className="lesson-list">
            <div className="lesson-item"><span className="lesson-time">22 JUL</span><div><strong>Entrega: mapa de canais</strong><small>Atividade individual · até 23h59</small></div><span className="status-pill gold">Pendente</span></div>
            <div className="lesson-item"><span className="lesson-time">26 JUL</span><div><strong>Prática de palco</strong><small>Montagem completa · 08h às 12h</small></div><span className="status-pill blue">Agendada</span></div>
          </div>
        </Panel>
        <Panel title="Financeiro" action="Ver pagamentos" id="financeiro">
          <div className="activity-list">
            <div className="activity-item"><span className="activity-dot">R$</span><div><strong>Mensalidade de julho</strong><span>Vencimento em 10 dias · R$ 320,00</span></div><span className="status-pill gold">Em aberto</span></div>
            <div className="activity-item"><span className="activity-dot">✓</span><div><strong>Mensalidade de junho</strong><span>Pagamento confirmado em 05/06</span></div></div>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
