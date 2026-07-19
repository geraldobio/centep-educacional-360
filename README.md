# CENTEP Educacional 360

Plataforma web moderna do CENTEP, construída com Next.js, React, TypeScript,
Tailwind CSS, Vinext e Cloudflare D1.

## O que está incluído

- Home institucional premium e responsiva.
- Os quatro cursos oficiais:
  - Técnico e Operador de Som.
  - Alinhamento de Sistemas Sonoros.
  - Mixagem na Prática.
  - Dinâmicos.
- Tela pública de matrícula online conectada ao banco de dados.
- Painel protegido para consultar matrículas recebidas.
- Busca por candidato, telefone, cidade, curso ou protocolo.
- Filtros por curso e status de atendimento.
- Atualização segura do status da matrícula.
- Contato rápido pelo WhatsApp e exportação CSV compatível com Excel.
- Login demonstrativo com fluxo por perfil.
- Portal do Aluno, Portal do Professor e Dashboard Administrativo.
- Seções CENTEP LAB, Hall da Excelência e parceiros.
- Navegação adaptada para computador, tablet e celular.

## Rotas principais

- `/` — site institucional.
- `/matricula` — formulário público de matrícula online.
- `/login` — seleção de perfil e acesso demonstrativo.
- `/portal-aluno` — CENTEP Connect.
- `/portal-professor` — área do professor.
- `/admin` — dashboard administrativo demonstrativo.
- `/admin-online` — matrículas reais, protegido por login e lista de administradores.

## Banco de dados online

As matrículas enviadas em `/matricula` são validadas no servidor e gravadas em
uma base Cloudflare D1. Cada solicitação recebe um protocolo exclusivo.

O painel `/admin-online` consulta diretamente a base online. A rota exige login
e só libera usuários presentes na lista administrativa do projeto. Por padrão,
o acesso está autorizado para `geraldo.bio@gmail.com`.

Arquivos relacionados:

```text
app/api/enrollments/route.ts  # API pública de matrícula
app/api/admin/                # atualização protegida de status
app/matricula/page.tsx        # formulário de matrícula
app/admin-online/page.tsx     # painel protegido
db/schema.ts                  # estrutura do banco
drizzle/                      # migrações versionadas
```

## Requisitos para desenvolvimento

- Node.js 22.13 ou superior.
- pnpm 10 ou superior.

Se já possuir Node.js, habilite o pnpm com:

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

5. Abra o endereço mostrado no terminal, normalmente
   `http://localhost:3000`.

> A interface pode ser executada localmente. A gravação real no D1 depende da
> configuração de hospedagem Cloudflare/Sites.

## Acessos de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Aluno | `aluno@centep.com.br` | `Aluno@2026` |
| Professor | `professor@centep.com.br` | `Professor@2026` |
| Administração | `admin@centep.com.br` | `Centep@2026` |

O login é demonstrativo e essas credenciais servem somente para apresentar os
portais. A sessão acadêmica ainda é mantida no navegador. O painel de matrículas
online usa autenticação protegida no servidor.

## Migrações e validação

Gerar uma nova migração após alterar `db/schema.ts`:

```bash
pnpm db:generate
```

Validar o projeto:

```bash
pnpm test
```

Gerar a versão de produção:

```bash
pnpm build
```

## Publicação

Esta versão com banco online deve ser publicada pelo Cloudflare/Sites, que cria
e conecta automaticamente o D1 definido em `.openai/hosting.json`.

Para implantação direta pelo Cloudflare Workers Builds, use:

- comando de build: `CLOUDFLARE_DIRECT_DEPLOY=1 pnpm run build`
- comando de implantação: `pnpm run deploy:cloudflare`

Defina `CLOUDFLARE_D1_DATABASE_ID` e, opcionalmente,
`CLOUDFLARE_D1_DATABASE_NAME` nas variáveis de build. Quando o identificador do
banco está presente, a implantação conecta o binding `DB` e aplica as migrações
automaticamente. O acesso administrativo também reconhece o cabeçalho de
identidade do Cloudflare Access.

O projeto está configurado para preservar as migrações em `drizzle/` e aplicá-las
durante a implantação. O site antigo no GitHub Pages pode permanecer como
reserva, mas o GitHub Pages sozinho não executa banco de dados nem API de
servidor.

## Próximas integrações de produção

- autenticação acadêmica real para aluno e professor;
- gestão completa de alunos, professores, turmas, notas e frequência;
- upload protegido de documentos e materiais;
- financeiro e meios de pagamento;
- notificações por e-mail ou WhatsApp;
- dados oficiais de contato, endereço, indicadores e parceiros.

## Estrutura principal

```text
app/
├── admin/              # dashboard demonstrativo
├── admin-online/       # matrículas reais protegidas
├── api/                # endpoints do servidor
├── components/         # componentes compartilhados
├── login/              # acesso por perfil
├── matricula/          # matrícula online
├── portal-aluno/       # dashboard do aluno
├── portal-professor/   # dashboard do professor
├── globals.css         # design system e responsividade
├── layout.tsx          # metadados e fontes
└── page.tsx            # Home institucional

db/                     # conexão e esquema D1/Drizzle
drizzle/                # migrações do banco
worker/                 # entrada Cloudflare
tests/                  # testes automatizados
```
