"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Brand } from "../components/site-chrome";
import { DEMO_ACCOUNTS, DemoRole, saveDemoSession } from "../lib/demo-auth";

const roleLabels: Record<DemoRole, { short: string; label: string }> = {
  student: { short: "AL", label: "Aluno" },
  teacher: { short: "PR", label: "Professor" },
  admin: { short: "AD", label: "Admin" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<DemoRole>("student");
  const [email, setEmail] = useState(DEMO_ACCOUNTS.student.email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS.student.password);
  const [error, setError] = useState("");

  const chooseRole = (nextRole: DemoRole) => {
    setRole(nextRole);
    setEmail(DEMO_ACCOUNTS[nextRole].email);
    setPassword(DEMO_ACCOUNTS[nextRole].password);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const account = DEMO_ACCOUNTS[role];
    if (email.trim().toLowerCase() !== account.email.toLowerCase() || password !== account.password) {
      setError("Os dados não correspondem ao perfil escolhido. Use o acesso demonstrativo abaixo.");
      return;
    }
    saveDemoSession({ role: account.role, name: account.name, email: account.email });
    router.push(account.destination);
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <Brand inverse />
        <div className="login-message">
          <div className="eyebrow light"><span /> CENTEP CONNECT</div>
          <h1>Seu aprendizado, <em>sempre no ritmo.</em></h1>
          <p>Acesse cursos, agenda, desempenho e ferramentas de gestão em um ambiente criado para toda a comunidade CENTEP.</p>
          <div className="login-mini-stats">
            <div><strong>4</strong><span>formações ativas</span></div>
            <div><strong>360°</strong><span>da jornada acadêmica</span></div>
            <div><strong>1</strong><span>plataforma integrada</span></div>
          </div>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-panel">
          <Link className="login-back" href="/"><span>←</span> Voltar para o site</Link>
          <h2>Bem-vindo de volta.</h2>
          <p>Escolha o seu perfil para experimentar o ambiente.</p>

          <div className="role-picker" aria-label="Perfil de acesso">
            {(Object.keys(roleLabels) as DemoRole[]).map((item) => (
              <button type="button" key={item} className={`role-option ${role === item ? "active" : ""}`} onClick={() => chooseRole(item)}>
                <span>{roleLabels[item].short}</span><strong>{roleLabels[item].label}</strong>
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></div>
            <div className="field"><label htmlFor="password">Senha</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div>
            <button className="login-submit" type="submit">Entrar no CENTEP 360 →</button>
            {error && <p className="login-error" role="alert">{error}</p>}
          </form>

          <div className="demo-box">
            <strong>Acessos de demonstração</strong>
            {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((item) => (
              <button type="button" key={item} onClick={() => chooseRole(item)}>
                <span>{roleLabels[item].label}</span>{DEMO_ACCOUNTS[item].email} · {DEMO_ACCOUNTS[item].password}
              </button>
            ))}
          </div>
          <p className="login-note">Este login é demonstrativo e funciona apenas neste navegador. A versão de produção deverá usar backend e autenticação segura.</p>
        </div>
      </section>
    </main>
  );
}
