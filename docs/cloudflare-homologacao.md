# Homologação no Cloudflare

Este projeto usa um Worker e um banco D1 separados para homologação.

## Proteções obrigatórias

- O nome do Worker e do D1 deve identificar claramente `homolog`, `staging` ou `hml`.
- O deploy deve usar `pnpm run deploy:staging`.
- A rotina cria um backup do D1 antes de aplicar migrações.
- O painel administrativo deve permanecer protegido pelo Cloudflare Access.
- Produção não deve ser alterada durante a homologação.

## Fluxo

1. Build da branch `agent/candidate-records`.
2. Backup do D1 de homologação.
3. Aplicação das migrações no D1 de homologação.
4. Deploy do Worker de homologação.
5. Teste funcional antes de qualquer decisão sobre merge ou produção.
