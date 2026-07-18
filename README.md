# CENTEP Educacional 360

## Publicar no GitHub Pages

O projeto inclui o fluxo `.github/workflows/pages.yml`. Depois de enviar o
codigo para um repositorio GitHub na branch `main`, abra **Settings > Pages** e
confirme **GitHub Actions** como fonte. A publicacao sera refeita
automaticamente a cada novo envio para a branch `main`.

Endereco padrao:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

Prévia funcional e responsiva do novo ecossistema digital do CENTEP, construída com Next.js, TypeScript, React e Tailwind CSS.

## O que está incluído

- Home institucional premium e responsiva, com imagem principal em alta definição e proporção 16:9.
- Logo oficial do CENTEP aplicada ao site e aos portais.
- Imagens exclusivas relacionadas ao conteúdo de cada curso.
- Apresentação dos quatro cursos oficiais:
  - Técnico e Operador de Som.
  - Alinhamento de Sistemas Sonoros.
  - Mixagem na Prática.
  - Dinâmicos.
- Seções CENTEP LAB, Hall da Excelência, parceiros e matrículas.
- Tela de login com escolha de perfil.
- Portal do Aluno navegável com painel, cursos, boletim, frequência, agenda, financeiro, biblioteca, certificados, carteirinha digital e mensagens.
- Portal do Professor com turmas, agenda, pendências e desempenho.
- Dashboard Administrativo com indicadores, matrículas e atalhos.
- Navegação adaptada para computador, tablet e celular.

## Requisitos

- Node.js 22 ou superior.
- pnpm 10 ou superior (recomendado).

Se você já possui Node.js, pode habilitar o pnpm com:

```bash
corepack enable
```

## Como executar no computador

1. Extraia o ZIP.
2. Abra um terminal dentro da pasta extraída.
3. Instale as dependências:

```bash
pnpm install
```

4. Inicie o projeto:

```bash
pnpm dev
```

5. Abra no navegador o endereço mostrado no terminal (normalmente `http://localhost:3000`).

## Acessos de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Aluno | `aluno@centep.com.br` | `Aluno@2026` |
| Professor | `professor@centep.com.br` | `Professor@2026` |
| Administração | `admin@centep.com.br` | `Centep@2026` |

O login desta prévia é demonstrativo e salva a sessão apenas no navegador (`localStorage`). Ele não deve ser usado em produção sem um backend seguro.

## Gerar a versão de produção

```bash
pnpm build
pnpm start
```

## Rotas principais

- `/` — site institucional.
- `/login` — seleção de perfil e acesso demonstrativo.
- `/portal-aluno` — CENTEP Connect.
- `/portal-professor` — área do professor.
- `/admin` — painel administrativo.

## Publicação

Este projeto pode ser hospedado em uma plataforma compatível com Next.js/Vite ou em infraestrutura própria. Antes de publicar como sistema real, ainda será necessário conectar:

- backend e banco de dados;
- autenticação segura;
- cadastro e gestão reais de alunos, professores e turmas;
- upload de arquivos;
- financeiro e meios de pagamento;
- dados oficiais de contato, endereço, indicadores e parceiros;
- fotografias oficiais e autorizadas do CENTEP, quando disponíveis, para substituir materiais demonstrativos.

## Estrutura principal

```text
app/
├── admin/              # Dashboard administrativo
├── components/         # Componentes compartilhados
├── lib/                # Autenticação demonstrativa
├── login/              # Tela de acesso
├── portal-aluno/       # Dashboard do aluno
├── portal-professor/   # Dashboard do professor
├── globals.css         # Design system e responsividade
├── layout.tsx          # Metadados e fontes
└── page.tsx            # Home institucional
```

## Observação sobre o pacote anterior

O arquivo `centep-preview-v1.zip` citado no histórico não estava disponível no ambiente desta entrega. Esta versão foi reconstruída e evoluída a partir do escopo, dos conteúdos e da identidade visual definidos e aprovados na conversa.
