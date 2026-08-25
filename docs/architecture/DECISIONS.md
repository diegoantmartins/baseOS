# Architecture Decision Records (ADRs) — BaseOS

## ADR-001 — Estratégia de Versionamento e Conventional Commits
- **Status:** Aprovado
- **Decisão:** Adoção de Semantic Versioning (SemVer `MAJOR.MINOR.PATCH`) e Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `security:`, `perf:`, `chore:`).
- **Racional:** Permite automação de changelog, rastreabilidade de bugs e controle de compatibilidade em releases.

---

## ADR-002 — Motor Vetorial de Súmulas BaseOS em Folha Única A4 Paisagem
- **Status:** Aprovado
- **Decisão:** Substituição de HTML rasterizado/jsPDF legado pelo motor vetorial `@react-pdf/renderer` com geometria milimétrica calculada para caber em **1 folha única A4** (tanto para 3 sets quanto para 5 sets).
- **Racional:** Elimina quebra de página, lentidão e distorção em impressões oficiais de federações esportivas.

---

## ADR-003 — Padrão Adapter para Persistência de Dados
- **Status:** Aprovado
- **Decisão:** Todo acesso a dados é encapsulado em `src/services/dataAccess.ts`, suportando alternância transparente entre LocalStorage (demo/offline) e Supabase PostgreSQL (produção).
- **Racional:** Facilidade para testes unitários rápidos sem dependência de banco em nuvem e portabilidade de infraestrutura.

---

## ADR-004 — Segurança e Proteção IDOR / BOLA com Multi-Tenancy
- **Status:** Aprovado
- **Decisão:** Criação de `TenantSecurityService` para validação obrigatória de escopo de organização e vínculo de equipe antes de qualquer mutação de elenco ou resultado.
- **Racional:** Garante isolamento seguro entre organizações e impede que representantes de uma equipe alterem dados de adversários.

---

## ADR-005 — Pipeline de CI/CD Automatizada com GitHub Actions
- **Status:** Aprovado
- **Decisão:** Execução de TypeScript typecheck, ESLint, Vitest test suite, npm audit e build de produção a cada Pull Request e push para `main`/`develop`.
- **Racional:** Previne regressões de código e garante conformidade de segurança e qualidade contínua.
