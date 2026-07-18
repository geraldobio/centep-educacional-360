"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "../components/site-chrome";

const courseOptions = [
  "Técnico e Operador de Som",
  "Alinhamento de Sistemas Sonoros",
  "Mixagem na Prática",
  "Dinâmicos",
];

export default function EnrollmentPage() {
  const [submitting, setSubmitting] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [error, setError] = useState("");

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { protocol?: string; error?: string };
      if (!response.ok || !result.protocol) {
        throw new Error(result.error || "Não foi possível registrar a matrícula.");
      }
      setProtocol(result.protocol);
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Tente novamente em alguns instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="online-enrollment-page">
      <header className="online-enrollment-header">
        <div className="container online-enrollment-header-inner">
          <Brand inverse />
          <span>Processo de Matrícula 2026</span>
          <Link href="/">Voltar ao site</Link>
        </div>
      </header>

      <section className="online-enrollment-hero">
        <div className="container">
          <div className="eyebrow light"><span /> Matrícula online</div>
          <h1>Seu futuro profissional<br />começa no CENTEP.</h1>
          <p>Envie sua solicitação e receba um protocolo. Os dados ficarão disponíveis para a Secretaria em um painel online seguro.</p>
        </div>
      </section>

      <div className="container online-enrollment-grid">
        <aside className="online-enrollment-aside">
          <span className="online-step-number">01</span>
          <h2>Preencha seus dados.</h2>
          <p>Escolha o curso e informe sua disponibilidade para que a equipe encontre a melhor turma.</p>
          <div className="online-step-list">
            <div><b>02</b><span><strong>Análise da Secretaria</strong><small>Conferência de turma e documentação.</small></span></div>
            <div><b>03</b><span><strong>Confirmação</strong><small>Orientação financeira e acesso ao portal.</small></span></div>
          </div>
          <div className="online-secure-note"><b>Dados centralizados</b><br />A solicitação poderá ser consultada pela equipe em diferentes dispositivos.</div>
        </aside>

        <section className="online-enrollment-card">
          {protocol ? (
            <div className="online-enrollment-success">
              <span>✓</span>
              <h2>Solicitação registrada!</h2>
              <p>A equipe do CENTEP poderá consultar sua matrícula no painel online.</p>
              <div><small>Seu protocolo</small><strong>{protocol}</strong></div>
              <Link className="button button-primary" href="/">Voltar ao site</Link>
            </div>
          ) : (
            <form onSubmit={submitEnrollment} className="online-form">
              <div className="online-form-heading">
                <div><h2>Solicitação de matrícula</h2><p>Campos com * são obrigatórios.</p></div>
                <span>Etapa única</span>
              </div>

              <label className="online-field online-field-full"><span>Nome completo *</span><input name="name" autoComplete="name" required minLength={4} /></label>
              <label className="online-field"><span>CPF *</span><input name="cpf" inputMode="numeric" required minLength={11} maxLength={14} placeholder="000.000.000-00" /></label>
              <label className="online-field"><span>Data de nascimento *</span><input name="birthDate" type="date" required /></label>
              <label className="online-field"><span>E-mail *</span><input name="email" type="email" autoComplete="email" required /></label>
              <label className="online-field"><span>WhatsApp *</span><input name="phone" type="tel" autoComplete="tel" required minLength={10} /></label>
              <label className="online-field"><span>Cidade *</span><input name="city" autoComplete="address-level2" required /></label>
              <label className="online-field"><span>Curso desejado *</span><select name="course" required defaultValue=""><option value="" disabled>Selecione</option>{courseOptions.map((course) => <option key={course}>{course}</option>)}</select></label>
              <label className="online-field"><span>Melhor horário *</span><select name="shift" required defaultValue=""><option value="" disabled>Selecione</option><option>Manhã</option><option>Tarde</option><option>Noite</option><option>Final de semana</option></select></label>
              <label className="online-field"><span>Experiência com áudio</span><select name="experience" defaultValue="Estou começando agora"><option>Estou começando agora</option><option>Tenho experiência básica</option><option>Já trabalho na área</option><option>Busco especialização</option></select></label>
              <label className="online-field online-field-full"><span>Objetivo profissional</span><textarea name="message" maxLength={1000} placeholder="Conte brevemente o que deseja aprender." /></label>
              <label className="online-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
              <label className="online-consent"><input type="checkbox" required /><span>Autorizo o CENTEP a utilizar estes dados para atendimento e continuidade do processo de matrícula.</span></label>
              {error && <p className="online-form-error" role="alert">{error}</p>}
              <div className="online-form-actions"><small>🔒 Envio protegido e armazenado online.</small><button type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar solicitação"}</button></div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
