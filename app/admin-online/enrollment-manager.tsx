"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

type EnrollmentRecord = Omit<EnrollmentRow, "cpfMasked"> & {
  cpf: string;
  birthDate: string;
  message: string;
};

type EnrollmentNote = {
  id: number;
  body: string;
  authorEmail: string;
  createdAt: string;
};

type EnrollmentDocument = {
  id: number;
  documentType: string;
  label: string;
  status: string;
  note: string;
  updatedBy: string;
  updatedAt: string;
};

type EnrollmentHistoryItem = {
  id: number;
  action: string;
  description: string;
  authorEmail: string;
  createdAt: string;
};

type EnrollmentDetail = {
  enrollment: EnrollmentRecord;
  notes: EnrollmentNote[];
  documents: EnrollmentDocument[];
  history: EnrollmentHistoryItem[];
};

const statuses = ["Nova", "Em contato", "Documentação", "Matriculado", "Arquivado"];
const documentStatuses = ["Pendente", "Recebido", "Validado", "Dispensado"];
const requiredDocuments = [
  { type: "identidade", label: "Documento de identidade" },
  { type: "cpf", label: "CPF" },
  { type: "comprovante_residencia", label: "Comprovante de residência" },
  { type: "foto", label: "Foto 3x4" },
  { type: "contrato", label: "Contrato de matrícula" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function whatsappUrl(row: EnrollmentRow | EnrollmentRecord) {
  const digits = row.phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá, ${row.name}! Somos da equipe CENTEP. Recebemos sua solicitação de matrícula no curso ${row.course}. Protocolo: ${row.protocol}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(parsed);
}

function formatBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function historyLabel(action: string) {
  const labels: Record<string, string> = {
    solicitacao: "Solicitação",
    status: "Status",
    conversao: "Matrícula",
    observacao: "Observação",
    documento: "Documento",
  };
  return labels[action] || "Atualização";
}

export function EnrollmentManager({ initialRows }: { initialRows: EnrollmentRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [courseFilter, setCourseFilter] = useState("Todos");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EnrollmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updatingDocument, setUpdatingDocument] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId]);

  const courses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.course))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = normalize(search.trim());
    return rows.filter((row) => {
      const searchable = normalize(
        [row.name, row.email, row.phone, row.city, row.course, row.protocol].join(" "),
      );
      return (
        (!term || searchable.includes(term)) &&
        (statusFilter === "Todos" || row.status === statusFilter) &&
        (courseFilter === "Todos" || row.course === courseFilter)
      );
    });
  }, [courseFilter, rows, search, statusFilter]);

  const selectedRow = rows.find((row) => row.id === selectedId) || null;
  const newCount = rows.filter((row) => row.status === "Nova").length;
  const enrolledCount = rows.filter((row) => row.status === "Matriculado").length;

  async function loadDetail(id: number, silent = false) {
    if (!silent) setDetailLoading(true);
    setDetailFeedback("");
    try {
      const response = await fetch(`/api/admin/enrollments/${id}`, { cache: "no-store" });
      const result = (await response.json()) as EnrollmentDetail & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível abrir a ficha.");
      setDetail(result);
    } catch (error) {
      setDetailFeedback(error instanceof Error ? error.message : "Não foi possível abrir a ficha.");
    } finally {
      if (!silent) setDetailLoading(false);
    }
  }

  function openDetail(id: number) {
    setSelectedId(id);
    setDetail(null);
    setNoteDraft("");
    void loadDetail(id);
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailFeedback("");
    setNoteDraft("");
  }

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    setFeedback("");
    setDetailFeedback("");
    try {
      const response = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o status.");
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
      setFeedback(
        status === "Matriculado"
          ? "Candidato convertido em aluno matriculado."
          : "Status atualizado com sucesso.",
      );
      if (selectedId === id) await loadDetail(id, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar o status.";
      setFeedback(message);
      setDetailFeedback(message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || noteDraft.trim().length < 3) return;
    setSavingNote(true);
    setDetailFeedback("");
    try {
      const response = await fetch(`/api/admin/enrollments/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteDraft }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar a observação.");
      setNoteDraft("");
      setDetailFeedback("Observação adicionada com sucesso.");
      await loadDetail(selectedId, true);
    } catch (error) {
      setDetailFeedback(
        error instanceof Error ? error.message : "Não foi possível salvar a observação.",
      );
    } finally {
      setSavingNote(false);
    }
  }

  async function updateDocument(documentType: string, status: string) {
    if (!selectedId) return;
    setUpdatingDocument(documentType);
    setDetailFeedback("");
    try {
      const response = await fetch(`/api/admin/enrollments/${selectedId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o documento.");
      setDetailFeedback("Documento atualizado com sucesso.");
      await loadDetail(selectedId, true);
    } catch (error) {
      setDetailFeedback(
        error instanceof Error ? error.message : "Não foi possível atualizar o documento.",
      );
    } finally {
      setUpdatingDocument(null);
    }
  }

  function exportCsv() {
    const header = [
      "Protocolo",
      "Candidato",
      "E-mail",
      "Telefone",
      "Cidade",
      "Curso",
      "Turno",
      "Experiência",
      "Status",
      "Data",
    ];
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
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
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
                      <td><code>{row.protocol}</code><small>{formatDateTime(row.createdAt)}</small></td>
                      <td><select className="online-status-select" aria-label={`Status de ${row.name}`} value={row.status} disabled={updatingId === row.id} onChange={(event) => void updateStatus(row.id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                      <td>
                        <div className="online-admin-actions">
                          <button type="button" className="online-open-record" onClick={() => openDetail(row.id)}>Abrir ficha</button>
                          <a className="online-whatsapp" href={whatsappUrl(row)} target="_blank" rel="noreferrer">WhatsApp</a>
                        </div>
                      </td>
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

      {selectedId && (
        <div className="candidate-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeDetail()}>
          <section className="candidate-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-record-title">
            <header className="candidate-modal-header">
              <div>
                <span>FICHA DO CANDIDATO</span>
                <h2 id="candidate-record-title">{detail?.enrollment.name || selectedRow?.name || "Carregando…"}</h2>
                <p>{detail?.enrollment.protocol || selectedRow?.protocol}</p>
              </div>
              <button type="button" aria-label="Fechar ficha" onClick={closeDetail}>×</button>
            </header>

            {detailLoading ? (
              <div className="candidate-modal-loading"><span /><p>Carregando ficha completa…</p></div>
            ) : detail ? (
              <div className="candidate-modal-body">
                <div className="candidate-sheet-banner">
                  <div className="candidate-avatar">{detail.enrollment.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div>
                  <div><small>Interesse principal</small><strong>{detail.enrollment.course}</strong><span>{detail.enrollment.shift} • {detail.enrollment.experience}</span></div>
                  <span className={`candidate-status candidate-status-${normalize(detail.enrollment.status).replace(/\s/g, "-")}`}>{detail.enrollment.status}</span>
                </div>

                {detailFeedback && <div className="candidate-feedback" role="status">{detailFeedback}</div>}

                <div className="candidate-sheet-grid">
                  <main>
                    <section className="candidate-sheet-section">
                      <div className="candidate-section-title"><span>01</span><div><h3>Dados pessoais</h3><p>Informações informadas pelo candidato.</p></div></div>
                      <dl className="candidate-data-grid">
                        <div><dt>Nome completo</dt><dd>{detail.enrollment.name}</dd></div>
                        <div><dt>CPF</dt><dd>{detail.enrollment.cpf}</dd></div>
                        <div><dt>Nascimento</dt><dd>{formatBirthDate(detail.enrollment.birthDate)}</dd></div>
                        <div><dt>Cidade</dt><dd>{detail.enrollment.city}</dd></div>
                        <div><dt>E-mail</dt><dd><a href={`mailto:${detail.enrollment.email}`}>{detail.enrollment.email}</a></dd></div>
                        <div><dt>Telefone</dt><dd><a href={`tel:${detail.enrollment.phone}`}>{detail.enrollment.phone}</a></dd></div>
                      </dl>
                    </section>

                    <section className="candidate-sheet-section">
                      <div className="candidate-section-title"><span>02</span><div><h3>Interesse e mensagem</h3><p>Preferências para o primeiro atendimento.</p></div></div>
                      <dl className="candidate-data-grid candidate-data-grid-three">
                        <div><dt>Curso</dt><dd>{detail.enrollment.course}</dd></div>
                        <div><dt>Disponibilidade</dt><dd>{detail.enrollment.shift}</dd></div>
                        <div><dt>Experiência</dt><dd>{detail.enrollment.experience}</dd></div>
                      </dl>
                      <div className="candidate-message"><span>Mensagem do candidato</span><p>{detail.enrollment.message || "Nenhuma mensagem adicional foi enviada."}</p></div>
                    </section>

                    <section className="candidate-sheet-section">
                      <div className="candidate-section-title"><span>03</span><div><h3>Checklist de documentos</h3><p>Acompanhe recebimento e validação.</p></div></div>
                      <div className="candidate-documents">
                        {requiredDocuments.map((required) => {
                          const stored = detail.documents.find((item) => item.documentType === required.type);
                          const currentStatus = stored?.status || "Pendente";
                          return (
                            <div key={required.type}>
                              <span className={`document-dot document-dot-${normalize(currentStatus)}`} />
                              <div><strong>{required.label}</strong><small>{stored ? `Atualizado por ${stored.updatedBy}` : "Ainda não recebido"}</small></div>
                              <select aria-label={`Status de ${required.label}`} value={currentStatus} disabled={updatingDocument === required.type} onChange={(event) => void updateDocument(required.type, event.target.value)}>{documentStatuses.map((status) => <option key={status}>{status}</option>)}</select>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </main>

                  <aside>
                    <section className="candidate-action-card">
                      <span>Próxima etapa</span>
                      <h3>{detail.enrollment.status === "Matriculado" ? "Aluno matriculado" : "Concluir atendimento"}</h3>
                      <p>{detail.enrollment.status === "Matriculado" ? "A conversão foi registrada no histórico." : "Atualize o status ou confirme a matrícula oficial."}</p>
                      <label><span>Status atual</span><select value={detail.enrollment.status} disabled={updatingId === selectedId} onChange={(event) => void updateStatus(selectedId, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                      {detail.enrollment.status !== "Matriculado" && <button type="button" className="candidate-convert" disabled={updatingId === selectedId} onClick={() => void updateStatus(selectedId, "Matriculado")}>Converter em matrícula oficial</button>}
                      <a className="candidate-whatsapp" href={whatsappUrl(detail.enrollment)} target="_blank" rel="noreferrer">Conversar pelo WhatsApp</a>
                    </section>

                    <section className="candidate-side-card">
                      <div className="candidate-side-title"><h3>Observações internas</h3><span>{detail.notes.length}</span></div>
                      <form className="candidate-note-form" onSubmit={addNote}>
                        <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={1000} placeholder="Registre contato, pendência ou orientação…" />
                        <button type="submit" disabled={savingNote || noteDraft.trim().length < 3}>{savingNote ? "Salvando…" : "Adicionar observação"}</button>
                      </form>
                      <div className="candidate-note-list">
                        {detail.notes.length ? detail.notes.map((note) => <article key={note.id}><p>{note.body}</p><small>{formatDateTime(note.createdAt)} • {note.authorEmail}</small></article>) : <p className="candidate-empty-copy">Nenhuma observação interna.</p>}
                      </div>
                    </section>

                    <section className="candidate-side-card">
                      <div className="candidate-side-title"><h3>Histórico</h3><span>{detail.history.length}</span></div>
                      <ol className="candidate-timeline">
                        {detail.history.map((item, index) => <li key={`${item.id}-${index}`}><i /><div><span>{historyLabel(item.action)}</span><p>{item.description}</p><small>{formatDateTime(item.createdAt)} • {item.authorEmail}</small></div></li>)}
                      </ol>
                    </section>
                  </aside>
                </div>
              </div>
            ) : (
              <div className="candidate-modal-error"><h3>Não foi possível abrir a ficha.</h3><p>{detailFeedback}</p><button type="button" onClick={() => void loadDetail(selectedId)}>Tentar novamente</button></div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
