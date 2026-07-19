"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type EnrollmentRow = {
  id: number;
  protocol: string;
  name: string;
  cpfMasked: string;
  email: string;
  phone: string;
  city: string;
  course: string;
  shift: string;
  experience: string;
  status: string;
  createdAt: string;
};

const statuses = ["Nova", "Em contato", "Documentação", "Matriculado", "Arquivado"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function whatsappUrl(row: EnrollmentRow) {
  const digits = row.phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá, ${row.name}! Somos da equipe CENTEP. Recebemos sua solicitação de matrícula no curso ${row.course}. Protocolo: ${row.protocol}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function EnrollmentManager({ initialRows }: { initialRows: EnrollmentRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [courseFilter, setCourseFilter] = useState("Todos");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  const courses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.course))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = normalize(search.trim());
    return rows.filter((row) => {
      const searchable = normalize([
        row.name,
        row.email,
        row.phone,
        row.city,
        row.course,
        row.protocol,
      ].join(" "));
      return (
        (!term || searchable.includes(term)) &&
        (statusFilter === "Todos" || row.status === statusFilter) &&
        (courseFilter === "Todos" || row.course === courseFilter)
      );
    });
  }, [courseFilter, rows, search, statusFilter]);

  const newCount = rows.filter((row) => row.status === "Nova").length;
  const enrolledCount = rows.filter((row) => row.status === "Matriculado").length;

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    setFeedback("");
    try {
      const response = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o status.");
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
      setFeedback("Status atualizado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCsv() {
    const header = ["Protocolo", "Candidato", "E-mail", "Telefone", "Cidade", "Curso", "Turno", "Experiência", "Status", "Data"];
    const body = filteredRows.map((row) => [
      row.protocol,
      row.name,
      row.email,
      row.phone,
      row.city,
      row.course,
      row.shift,
      row.experience,
      row.status,
      row.createdAt,
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `matriculas-centep-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="online-admin-kpis">
        <article><span>Solicitações</span><strong>{rows.length}</strong><small>Total registrado</small></article>
        <article><span>Novas</span><strong>{newCount}</strong><small>Aguardando contato</small></article>
        <article><span>Matriculados</span><strong>{enrolledCount}</strong><small>Conversões confirmadas</small></article>
        <article><span>Banco</span><strong className="online-status">ATIVO</strong><small>Armazenamento central</small></article>
      </div>

      <section className="online-admin-panel" id="matriculas">
        <div className="online-admin-panel-head">
          <div><h2>Solicitações recebidas</h2><p>Pesquise, acompanhe e organize o atendimento aos candidatos.</p></div>
          <Link href="/matricula">+ Nova matrícula</Link>
        </div>

        {rows.length ? (
          <>
            <div className="online-admin-toolbar">
              <label className="online-admin-search">
                <span className="sr-only">Pesquisar matrículas</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, cidade ou protocolo" />
              </label>
              <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label><span>Curso</span><select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option>Todos</option>{courses.map((course) => <option key={course}>{course}</option>)}</select></label>
              <button type="button" onClick={exportCsv} disabled={!filteredRows.length}>Exportar CSV</button>
            </div>
            <div className="online-admin-result-line"><span>{filteredRows.length} resultado(s)</span>{feedback && <strong role="status">{feedback}</strong>}</div>
            {filteredRows.length ? (
              <div className="online-admin-table-wrap">
                <table className="online-admin-table">
                  <thead><tr><th>Candidato</th><th>Curso</th><th>Contato</th><th>Disponibilidade</th><th>Protocolo</th><th>Status</th><th>Ações</th></tr></thead>
                  <tbody>{filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong><small>{row.city} • {row.cpfMasked}</small></td>
                      <td>{row.course}</td>
                      <td><strong>{row.phone}</strong><small>{row.email}</small></td>
                      <td>{row.shift}<small>{row.experience}</small></td>
                      <td><code>{row.protocol}</code><small>{row.createdAt}</small></td>
                      <td><select className="online-status-select" aria-label={`Status de ${row.name}`} value={row.status} disabled={updatingId === row.id} onChange={(event) => updateStatus(row.id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                      <td><a className="online-whatsapp" href={whatsappUrl(row)} target="_blank" rel="noreferrer">WhatsApp</a></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : (
              <div className="online-admin-no-results"><h3>Nenhuma matrícula encontrada.</h3><p>Ajuste a busca ou os filtros para visualizar outros registros.</p></div>
            )}
          </>
        ) : (
          <div className="online-admin-empty"><span>MT</span><h3>Nenhuma matrícula recebida ainda.</h3><p>Assim que um candidato enviar o formulário, os dados aparecerão aqui.</p><Link className="button button-primary" href="/matricula">Abrir formulário</Link></div>
        )}
      </section>
    </>
  );
}
