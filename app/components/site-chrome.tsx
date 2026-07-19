"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="CENTEP Educacional 360 — início">
      <span className="brand-mark"><i /><i /><i /></span>
      <span><strong>CENTEP</strong><small>Educacional 360</small></span>
    </Link>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`public-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-inner">
        <Brand inverse={!scrolled} />
        <button className={`menu-toggle ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label="Abrir menu" aria-expanded={open}>
          <span /><span /><span />
        </button>
        <nav className={open ? "open" : ""} aria-label="Navegação principal">
          <a href="#sobre" onClick={() => setOpen(false)}>O CENTEP</a>
          <a href="#cursos" onClick={() => setOpen(false)}>Cursos</a>
          <a href="#lab" onClick={() => setOpen(false)}>CENTEP LAB</a>
          <a href="#formandos" onClick={() => setOpen(false)}>Formandos</a>
          <a href="#matricula" onClick={() => setOpen(false)}>Matrículas</a>
          <Link className="header-login" href="/login" onClick={() => setOpen(false)}>Área restrita <span>↗</span></Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Brand inverse />
          <p>Formação técnica, prática e conexão com o mercado de áudio profissional.</p>
        </div>
        <div><strong>Navegue</strong><a href="#sobre">O CENTEP</a><a href="#cursos">Cursos</a><a href="#lab">CENTEP LAB</a><a href="#formandos">Formandos</a></div>
        <div><strong>Acesse</strong><Link href="/portal-aluno">Portal do Aluno</Link><Link href="/portal-professor">Portal do Professor</Link><Link href="/admin">Administração</Link><Link href="/login">Login</Link></div>
        <div><strong>Contato</strong><a href="mailto:contato@centep.com.br">contato@centep.com.br</a><span>Salvador, Bahia</span><span>Seg–Sex, 8h às 18h</span></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 CENTEP Educacional 360.</span><span>Protótipo funcional para validação.</span></div>
    </footer>
  );
}
