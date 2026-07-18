import Link from "next/link";
import { PublicHeader, SiteFooter } from "./components/site-chrome";

const courses = [
  {
    code: "TS",
    eyebrow: "Formação profissional",
    title: "Técnico e Operador de Som",
    description:
      "Da estrutura de ganho à operação ao vivo: uma formação completa para eventos, igrejas, shows e produções.",
    topics: ["Mesas digitais", "Sistemas de P.A.", "Operação ao vivo"],
    theme: "course-blue",
  },
  {
    code: "AS",
    eyebrow: "Especialização",
    title: "Alinhamento de Sistemas Sonoros",
    description:
      "Medição, fase, delay e otimização para extrair desempenho, cobertura e consistência de sistemas profissionais.",
    topics: ["Time alignment", "Medições", "Processadores"],
    theme: "course-cyan",
  },
  {
    code: "MP",
    eyebrow: "Imersão prática",
    title: "Mixagem na Prática",
    description:
      "Treino intensivo de mixagem com situações reais, decisões rápidas e técnicas aplicadas ao mercado.",
    topics: ["Voz e banda", "EQ e efeitos", "Fluxo de mixagem"],
    theme: "course-gold",
  },
  {
    code: "DN",
    eyebrow: "Domínio técnico",
    title: "Dinâmicos",
    description:
      "Controle e musicalidade com compressores, gates, limiters, sidechain e processamento multibanda.",
    topics: ["Compressão", "Gates", "Sidechain"],
    theme: "course-violet",
  },
];

const stats = [
  ["+2.500", "profissionais formados"],
  ["4", "formações especializadas"],
  ["+50", "empresas parceiras"],
  ["95%", "de satisfação dos alunos"],
];

const portalAreas = [
  {
    index: "01",
    title: "CENTEP Connect",
    text: "Progresso, agenda, frequência, materiais, certificados e vida financeira em uma visão única.",
    href: "/portal-aluno",
    action: "Ver portal do aluno",
  },
  {
    index: "02",
    title: "Portal do Professor",
    text: "Turmas, aulas, chamada, materiais e desempenho acadêmico organizados para decisões rápidas.",
    href: "/portal-professor",
    action: "Ver área do professor",
  },
  {
    index: "03",
    title: "Gestão 360",
    text: "Matrículas, indicadores, cursos e operação institucional em um dashboard claro e objetivo.",
    href: "/admin",
    action: "Ver administração",
  },
];

export default function Home() {
  return (
    <main>
      <PublicHeader />

      <section className="hero" id="inicio">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span /> Escola de áudio profissional</div>
            <h1>
              Conhecimento que se ouve. <em>Prática que transforma.</em>
            </h1>
            <p>
              Formação técnica para quem quer dominar o áudio, operar com segurança e conquistar espaço no mercado profissional.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#cursos">Conheça os cursos <span>↗</span></a>
              <Link className="button button-ghost" href="/login">Acessar o portal</Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>AC</span><span>JM</span><span>RS</span><span>+</span>
              </div>
              <p><strong>Profissionais em atividade</strong><br />formados para o mercado real.</p>
            </div>
          </div>

          <div className="audio-stage" aria-label="Representação visual de uma mesa de áudio profissional">
            <div className="stage-topline">
              <div><span className="live-dot" /> CENTEP LIVE LAB</div>
              <span className="stage-chip">SESSION 08</span>
            </div>
            <div className="wave-panel">
              <div className="wave-grid" />
              <div className="wave-line">
                {[18, 34, 26, 62, 42, 78, 50, 88, 44, 69, 34, 56, 22, 48, 30, 18].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="wave-label"><span>INPUT SIGNAL</span><strong>-12.4 dB</strong></div>
            </div>
            <div className="console-grid">
              {["VOX", "DRUM", "BASS", "GTR", "KEY", "FX"].map((channel, index) => (
                <div className="channel" key={channel}>
                  <span className={`channel-led led-${index + 1}`} />
                  <div className="knob"><i /></div>
                  <div className="meter"><i style={{ height: `${35 + index * 8}%` }} /></div>
                  <div className="fader"><i style={{ top: `${55 - index * 6}%` }} /></div>
                  <strong>{channel}</strong>
                </div>
              ))}
            </div>
            <div className="stage-note">
              <span className="note-icon">⌁</span>
              <div><strong>Aprenda fazendo</strong><small>Equipamentos, método e acompanhamento profissional.</small></div>
            </div>
          </div>
        </div>

        <div className="container stat-strip">
          {stats.map(([value, label]) => (
            <div className="stat-item" key={label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="section about" id="sobre">
        <div className="container about-grid">
          <div className="section-heading">
            <div className="eyebrow dark"><span /> Sobre o CENTEP</div>
            <h2>Formando profissionais de excelência.</h2>
          </div>
          <div className="about-copy">
            <p className="lead">O CENTEP une experiência de mercado, ensino técnico e prática orientada para preparar profissionais confiantes e atualizados.</p>
            <p>Ao longo da nossa trajetória, construímos credibilidade entre alunos e profissionais do setor. Nosso compromisso é oferecer conteúdo teórico e prático, professores atuantes e uma jornada de aprendizagem conectada às exigências do mercado.</p>
            <div className="values-row">
              <span><i>✓</i> Prática profissional</span>
              <span><i>✓</i> Ensino atualizado</span>
              <span><i>✓</i> Conexão com o mercado</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section courses-section" id="cursos">
        <div className="container">
          <div className="section-intro">
            <div>
              <div className="eyebrow dark"><span /> Nossas formações</div>
              <h2>Escolha o próximo nível da sua carreira.</h2>
            </div>
            <p>Quatro experiências complementares, criadas para transformar fundamentos em domínio técnico.</p>
          </div>
          <div className="course-grid">
            {courses.map((course) => (
              <article className={`course-card ${course.theme}`} key={course.title}>
                <div className="course-visual">
                  <span className="course-code">{course.code}</span>
                  <div className="mini-wave">{[24, 50, 35, 76, 42, 68, 30, 56].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div>
                  <span className="course-number">0{courses.indexOf(course) + 1}</span>
                </div>
                <div className="course-body">
                  <span className="card-eyebrow">{course.eyebrow}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <ul>{course.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
                  <Link href="/matricula">Quero me matricular <span>→</span></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section lab-section" id="lab">
        <div className="container lab-grid">
          <div className="lab-copy">
            <div className="eyebrow light"><span /> CENTEP LAB</div>
            <h2>O áudio continua depois da aula.</h2>
            <p>Um ambiente técnico para revisar, experimentar e aprofundar competências com materiais organizados por nível e aplicação.</p>
            <div className="lab-feature-grid">
              {["Videoaulas", "Presets", "Diagramas", "Simulados", "Riders", "Biblioteca"].map((item, index) => (
                <div key={item}><span>0{index + 1}</span><strong>{item}</strong></div>
              ))}
            </div>
            <Link href="/login" className="button button-light">Entrar no ambiente <span>↗</span></Link>
          </div>
          <div className="lab-browser">
            <div className="browser-top"><i /><i /><i /><span>lab.centep.edu.br</span></div>
            <div className="browser-body">
              <aside><b>C</b><span className="active" /><span /><span /><span /></aside>
              <div className="browser-content">
                <small>BIBLIOTECA TÉCNICA</small>
                <h3>Continue aprendendo.</h3>
                <div className="lesson-feature">
                  <div className="play">▶</div>
                  <div><span>MÓDULO 04</span><strong>Compressão sem mistério</strong><small>12 min • Nível intermediário</small></div>
                </div>
                <div className="resource-row">
                  <div><i>PDF</i><span><strong>Checklist de passagem</strong><small>Atualizado hoje</small></span></div>
                  <div><i>SCN</i><span><strong>Cena de prática X32</strong><small>Download técnico</small></span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section portals" id="portais">
        <div className="container">
          <div className="section-intro compact">
            <div>
              <div className="eyebrow dark"><span /> Ecossistema digital</div>
              <h2>Uma plataforma para cada jornada.</h2>
            </div>
          </div>
          <div className="portal-grid">
            {portalAreas.map((portal) => (
              <article className="portal-card" key={portal.title}>
                <span className="portal-index">{portal.index}</span>
                <h3>{portal.title}</h3>
                <p>{portal.text}</p>
                <Link href={portal.href}>{portal.action} <span>↗</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section excellence" id="formandos">
        <div className="container excellence-grid">
          <div className="excellence-card">
            <span className="quote-mark">“</span>
            <blockquote>O curso me deu método, confiança e uma nova forma de ouvir cada decisão da mixagem.</blockquote>
            <div className="graduate">
              <span>RS</span><div><strong>Rafael Santos</strong><small>Formado em Técnico e Operador de Som</small></div>
            </div>
          </div>
          <div className="excellence-copy">
            <div className="eyebrow dark"><span /> Hall da excelência</div>
            <h2>Resultados que ganham palco.</h2>
            <p>Mais do que certificados, celebramos trajetórias. O mural de formandos conecta histórias, conquistas e novas oportunidades.</p>
            <Link href="/matricula" className="text-link">Comece a sua história <span>→</span></Link>
          </div>
        </div>
      </section>

      <section className="partners" aria-label="Empresas parceiras">
        <div className="container partner-row">
          <span>PARCEIROS QUE CONECTAM TALENTO E MERCADO</span>
          <strong>SONORA</strong><strong>STAGE+</strong><strong>ÁUDIO PRO</strong><strong>LIVESET</strong><strong>BAHIA MIX</strong>
        </div>
      </section>

      <section className="enrollment" id="matricula">
        <div className="enrollment-glow" />
        <div className="container enrollment-grid">
          <div>
            <div className="eyebrow light"><span /> Novas turmas</div>
            <h2>Seu próximo grande trabalho começa aqui.</h2>
            <p>Conheça os cursos, converse com a equipe e encontre a formação certa para o seu momento.</p>
          </div>
          <div className="enrollment-action">
            <Link className="button button-gold" href="/matricula">Fazer matrícula online <span>↗</span></Link>
            <small>Envio com protocolo e acompanhamento pela equipe CENTEP.</small>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
