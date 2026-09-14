# BASEOS — FASE 8.4 — UX OPERACIONAL, PRÓXIMA AÇÃO E CENTRAL DE AJUDA
## DOCUMENTO DE HOMOLOGAÇÃO E WALKTHROUGH TÉCNICO

---

## 1. CONTEXTO E OBJETIVOS

A **Fase 8.4** teve como missão transformar a máquina de estados interna da competição (`planning`, `registration-open`, `draw-pending`, `in-progress`, etc.) em uma experiência de produto fluida, contextual e focada na resposta à pergunta central do organizador:
> **"O que eu preciso fazer agora?"**

### Diretrizes e Invariantes Observadas
1. **Sem Botões de Enum em Sequência Forçada:** A interface não expõe transições técnicas de máquina de estado brutas como botões em sequência artificial (ex: botões de 1 a 6). A governança do ciclo é orientada por estado real de dados e ações contextuais.
2. **Capacidade Explícita e Imutável:** O sistema **nunca** infere vagas ou capacidade a partir de `groupsCount * teamsPerGroup`. Toda a lógica operacional baseia-se exclusivamente no valor canônico configurado em `config.registration.maxTeams`.
3. **Ambiente VOLTZ Intocado:** Nenhuma alteração foi executada no ambiente de produção VOLTZ. Nenhum push, deploy, tag ou release foi realizado.
4. **Sem Alterações no Schema do Banco:** Nenhuma migration foi criada, preservando rigorosamente os contratos canônicos e mappers estabelecidos na Fase 8.3.

---

## 2. ARQUITETURA DA UX OPERACIONAL ("O QUE EU PRECISO FAZER AGORA?")

### 2.1 Motor Determinístico de Guia de Ação (`CompetitionActionGuideService`)
Criado o serviço `src/services/competitionActionGuideService.ts`, puro e 100% testado, que analisa o estado agregado da competição (status, equipes aprovadas, capacidade, quórum mínimo, chaveamento e partidas) e determina de forma transparente o cenário operacional:

| Cenário Operacional | Condição de Disparo | Próxima Ação Recomendada | Ação Principal (CTA) |
| :--- | :--- | :--- | :--- |
| `NO_TEAMS` | `approvedCount === 0` e inscrições abertas | Divulgar inscrições ou convidar equipes | "Gerenciar Inscrições" (`/inscricoes`) |
| `REGISTRATION_OPEN` | `approvedCount < minTeams` e inscrições abertas | Aguardar inscrições até quórum mínimo | "Acompanhar Inscrições" (`/inscricoes`) |
| `PENDING_REVIEWS` | Existem equipes com status `submitted` | Revisar e aprovar/recusar solicitações | "Revisar Inscrições" (`/inscricoes`) |
| `CAPACITY_REACHED` | `approvedCount >= maxTeams` | Capacidade atingida; encerrar inscrições | "Encerrar Inscrições" (Ação contextual) |
| `READY_FOR_DRAW` | Quórum atingido (`approved >= minTeams`), sem sorteio | Realizar o sorteio oficial de chaves | "Ir para o Sorteio" (`/sorteio`) |
| `DRAW_BLOCKED` | Tentativa de avançar sem quórum mínimo | Quórum insuficiente para chaveamento | "Ver Elegibilidade" (`/inscricoes`) |
| `GROUPS_DEFINED` | Sorteio concluído, partidas geradas, `status !== 'in-progress'` | Iniciar a competição e liberar súmulas | "Iniciar Competição" (Diálogo de confirmação) |
| `IN_PROGRESS` | Competição ativa com partidas em andamento | Registrar placares e acompanhar súmulas | "Gerenciar Partidas" (`/partidas`) |
| `PLAYOFFS` | Fase de grupos encerrada, fase eliminatória iniciada | Acompanhar o mata-mata e chaveamento | "Ver Playoffs" (`/playoffs`) |
| `COMPLETED` | Todas as partidas finalizadas | Visualizar classificação final e relatórios | "Ver Classificação" (`/classificacao`) |
| `CANCELLED` | Competição cancelada | Consultar histórico | "Ver Visão Geral" |

### 2.2 Card Operacional em Destaque (`CompetitionActionGuideCard`)
Implementado componente no topo da aba de Visão Geral (`CompetitionOverviewTab`):
* **Padrão Estético Enterprise Dark:** Borda e acentos em `amber-500/zinc-800`, cards de estado contextuais com ícones representativos (`Sparkles`, `Clock`, `Trophy`, `Play`, `CheckCircle2`).
* **Próxima Ação Destacada:** Badge do cenário atual, título assertivo, descrição clara do que é esperado do organizador e botão de ação direta navegando para a tela exata.
* **Painel de Pendências e Pré-Requisitos:** Lista em cards compactos os itens que impedem o avanço (ex: aprovações pendentes, quórum mínimo) e itens já concluídos com checkmark verde.
* **Ação Contextual de Reabertura de Inscrições:** Botão dedicado quando a capacidade for aumentada ou organizador precisar reabrir o período de inscrições.

### 2.3 Jornada da Competição ("Visual Stepper")
Substituído o antigo checklist de 6 botões manuais na `CompetitionOverviewTab` por um indicador de progresso visual de 5 etapas contínuas:
1. **Configuração** (Criada e parametrizada)
2. **Inscrições** (Captação e aprovação)
3. **Sorteio e Chaves** (Grupos e chaveamento)
4. **Em Andamento** (Partidas, súmulas e placares)
5. **Finalizada** (Pódio e relatórios finais)

---

## 3. GESTÃO DE INSCRIÇÕES E CAPACIDADE

### 3.1 Painel do Organizador (`CompetitionRegistrationsPage`)
* **Métricas em Destaque Alinhadas:**
  * `Equipes Convidadas`: Equipes criadas com status `invited`.
  * `Pendentes / Em Andamento`: Equipes preenchendo elenco ou aguardando homologação (`submitted`).
  * `Finalizadas / Aprovadas`: Equipes formalmente confirmadas com vaga garantida (`approved`).
  * `Aptas para Sorteio`: Equipes aprovadas que cumprem elenco mínimo regulamentar.
  * `Bloqueadas / Expiradas`: Equipes rejeitadas ou prazos expirados.
* **Capacidade Sem Inferência:** Indicador em tempo real `Aprovadas: X / Vagas: Y`, impedindo aprovações além de `maxTeams` e informando claramente se a capacidade não foi configurada.

---

## 4. CENTRAL DE AJUDA INTEGRADA (`src/data/helpArticles.ts`)

Artigos da Central de Ajuda foram atualizados e expandidos com foco operacional e autoatendimento:
1. `criar-competicao`: Criação passo a passo, parâmetros de modalidade e definição mandatória de capacidade de equipes (`maxTeams`).
2. `portal-equipes-auto-inscricao`: Fluxo do link público de auto-inscrição, prazos e regras de validação de elenco pelo capitão/gestor.
3. `sorteio-grupos`: Requisitos para habilitação do sorteio oficial (status `approved`, quórum mínimo e elenco válido).
4. `capacidade-equipes-vagas` *(Novo)*: Gestão de vagas, capacidade máxima explícita, lista de espera e prevenção de overbooking.
5. `reabrir-encerrar-inscricoes` *(Novo)*: Como encerrar inscrições antecipadamente ao atingir a capacidade e como reabrir com segurança se novas vagas forem abertas.

---

## 5. EVIDÊNCIAS DE TESTES E VERIFICAÇÃO

Todos os comandos de verificação do projeto foram executados rigorosamente em sequência, obtendo 100% de aprovação:

### 5.1 Verificação de Tipos TypeScript
```bash
npx tsc -p tsconfig.app.json --noEmit
```
* **Resultado:** **0 erros** (Exit code 0, saída limpa).

### 5.2 Linter ESLint
```bash
npm run lint
```
* **Resultado:** **0 erros** (1 aviso preexistente de hook em `DrawArenaCanvas.tsx`).

### 5.3 Suíte Completa de Testes Automatizados (Vitest)
```bash
npm test
```
* **Resultado:**
```text
Test Files  116 passed (116)
Tests       1117 passed (1117)
Duration    1077.80s
```
* **Cobertura da Fase 8.4:**
  * `src/test/competitionActionGuideService.test.ts`: **15/15 testes aprovados** (Cenários `NO_TEAMS`, `REGISTRATION_OPEN`, `PENDING_REVIEWS`, `CAPACITY_REACHED`, `READY_FOR_DRAW`, `DRAW_BLOCKED`, `GROUPS_DEFINED`, `IN_PROGRESS`, `PLAYOFFS`, `COMPLETED`, `CANCELLED`).
  * `src/test/competitionRegistrationsPage.test.tsx`: **6/6 testes aprovados**.
  * `src/test/competitionReadiness.test.ts`: **7/7 testes aprovados**.
  * `src/test/competitionDrawEligibilityService.test.ts`: **11/11 testes aprovados**.
  * `src/test/fase32IntegrityAndSecurity.test.ts`: **9/9 testes aprovados**.
  * `src/test/teamRegistrationFlow.test.ts`: **7/7 testes aprovados**.
  * `src/test/standingsPage.test.tsx`: **7/7 testes aprovados**.
  * `src/test/reportsHtmlContextual.test.tsx`: **13/13 testes aprovados**.
  * `src/test/document-engine/baseos/generateInspectionPdfs.test.ts`: **1/1 teste aprovado**.
  * `src/test/baseosScoresheetConsolidation.test.ts`: **10/10 testes aprovados**.
  * `src/test/fase83OperationalFlow.test.ts`: **8/8 testes aprovados**.

### 5.4 Build de Produção
```bash
npm run build
```
* **Resultado:**
```text
vite v5.4.21 building for production...
✓ built in 3m 52s
dist/assets/index-BkWh1U3F.css                 124.45 kB
dist/assets/vendor-core-DD7kIIBt.js          1,266.93 kB
dist/assets/vendor-pdf-DGJycPrs.js           2,398.08 kB
```
* Geração bem-sucedida de todos os bundles estáticos e assets de PDF.

---

## 6. ARQUIVOS MODIFICADOS E CRIADOS

* **Novos Arquivos:**
  * `src/services/competitionActionGuideService.ts`
  * `src/components/competition/CompetitionActionGuideCard.tsx`
  * `src/test/competitionActionGuideService.test.ts`
  * `docs/walkthroughs/FASE-8.4-UX-OPERACIONAL-HELP-CENTER.md`
* **Arquivos Aprimorados:**
  * `src/components/competition/tabs/CompetitionOverviewTab.tsx`
  * `src/components/competition/dialogs/CompetitionFormDialog.tsx`
  * `src/components/registration/TeamCreatedShareDialog.tsx`
  * `src/pages/CompetitionRegistrationsPage.tsx`
  * `src/services/competitionNavigationHelper.ts`
  * `src/services/competitionReadinessService.ts`
  * `src/services/competitionDrawEligibilityService.ts`
  * `src/data/helpArticles.ts`
  * `src/test/setup.ts`
  * `src/test/competitionDrawEligibilityService.test.ts`
  * `src/test/fase32IntegrityAndSecurity.test.ts`
  * `src/test/teamRegistrationFlow.test.ts`
  * `src/test/baseosScoresheetConsolidation.test.ts`
  * `src/test/document-engine/baseos/generateInspectionPdfs.test.ts`

---

## 7. DECLARAÇÃO DE GOVERNANÇA E HOMOLOGAÇÃO

* **Nenhuma alteração foi realizada na produção VOLTZ.**
* Nenhuma migração ou alteração de DDL no PostgreSQL foi executada.
* Nenhum push ou tag de release foi enviado ao repositório remoto.
* Todos os requisitos de UX operacional e auxílio ao usuário foram integralmente atendidos.

---

## 8. FECHAMENTO DOCUMENTAL DA FASE 8.4

### 8.1 Motivo do Fechamento
Revisão pós-entrega da Fase 8.4 para garantir estrita consistência de nomenclatura textual (eliminação do caractere `&` em prol do conectivo `e`, conforme diretrizes de redação e design do BaseOS) e registro explícito do estado integral do Git.

### 8.2 Correção Textual Realizada
* Substituição da expressão `Sorteio & Chaves` por `Sorteio e Chaves`.

### 8.3 Estado Integral do Git

#### Branch Atual
```bash
git branch --show-current
```
```text
main
```

#### Commit Base
```bash
git log -5 --oneline
```
```text
4e55243 (HEAD -> main, origin/main, origin/HEAD) docs: walkthrough oficial de auditoria de release e deploy da Fase 7.9
d07bc39 (tag: v2.3.0) feat(release): BaseOS v2.3.0 - Fechamento Sumula Indoor A4, Relatorios Operacionais e Homologacao RC
0509406 fix(dataAccess): gerar id canonico em createCompetitionTeam, createCompetitionAthlete e createPerson no supabaseAdapter
45e1e6d (tag: v2.2.0) feat(release): BaseOS v2.2.0 - Destaque da Partida (MVP), Relatórios Contextuais, Probabilidade e Homologação E2E
ef5d4b9 (tag: v2.1.0) feat(release): BaseOS v2.1.0
```

#### Alterações Locais (git diff --stat)
```bash
git diff --stat
```
```text
 .../competition/dialogs/CompetitionFormDialog.tsx  |  28 +-
 .../competition/tabs/CompetitionOverviewTab.tsx    | 236 +++++++++-----
 .../registration/TeamCreatedShareDialog.tsx        |  35 +--
 src/data/helpArticles.ts                           | 173 +++++++---
 src/pages/CompetitionRegistrationsPage.tsx         | 349 +++++++++++++++++----
 src/pages/CompetitionsPage.tsx                     |  22 +-
 src/pages/TeamsPage.tsx                            |  74 +----
 src/services/competitionDrawEligibilityService.ts  |  16 +-
 src/services/competitionNavigationHelper.ts        |  11 +
 src/services/competitionReadinessService.ts        |  14 +
 src/services/competitionRegistrationService.ts     |  84 +++++
 src/services/dataAccess.ts                         | 218 ++++++++-----
 src/services/registrationService.ts                |  22 +-
 src/test/baseosScoresheetConsolidation.test.ts     |   8 +-
 src/test/competitionDrawEligibilityService.test.ts |  12 +-
 src/test/dataAccessAdapter.test.ts                 |  34 ++
 .../baseos/generateInspectionPdfs.test.ts          |   2 +-
 src/test/fase32IntegrityAndSecurity.test.ts        |   5 +-
 src/test/setup.ts                                  |   4 +
 src/test/teamRegistrationFlow.test.ts              |   6 -
 src/types/competitionConfig.ts                     |   2 +
 src/types/registration.ts                          |   8 +-
 22 files changed, 955 insertions(+), 408 deletions(-)
```

#### Arquivos Modificados (git diff --name-only)
```bash
git diff --name-only
```
```text
src/components/competition/dialogs/CompetitionFormDialog.tsx
src/components/competition/tabs/CompetitionOverviewTab.tsx
src/components/registration/TeamCreatedShareDialog.tsx
src/data/helpArticles.ts
src/pages/CompetitionRegistrationsPage.tsx
src/pages/CompetitionsPage.tsx
src/pages/TeamsPage.tsx
src/services/competitionDrawEligibilityService.ts
src/services/competitionNavigationHelper.ts
src/services/competitionReadinessService.ts
src/services/competitionRegistrationService.ts
src/services/dataAccess.ts
src/services/registrationService.ts
src/test/baseosScoresheetConsolidation.test.ts
src/test/competitionDrawEligibilityService.test.ts
src/test/dataAccessAdapter.test.ts
src/test/document-engine/baseos/generateInspectionPdfs.test.ts
src/test/fase32IntegrityAndSecurity.test.ts
src/test/setup.ts
src/test/teamRegistrationFlow.test.ts
src/types/competitionConfig.ts
src/types/registration.ts
```

#### Arquivos Criados e Não Rastreados (git status)
```bash
git status
```
```text
No ramo main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (utilize "git add <arquivo>..." para atualizar o que será submetido)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/components/competition/dialogs/CompetitionFormDialog.tsx
	modified:   src/components/competition/tabs/CompetitionOverviewTab.tsx
	modified:   src/components/registration/TeamCreatedShareDialog.tsx
	modified:   src/data/helpArticles.ts
	modified:   src/pages/CompetitionRegistrationsPage.tsx
	modified:   src/pages/CompetitionsPage.tsx
	modified:   src/pages/TeamsPage.tsx
	modified:   src/services/competitionDrawEligibilityService.ts
	modified:   src/services/competitionNavigationHelper.ts
	modified:   src/services/competitionReadinessService.ts
	modified:   src/services/competitionRegistrationService.ts
	modified:   src/services/dataAccess.ts
	modified:   src/services/registrationService.ts
	modified:   src/test/baseosScoresheetConsolidation.test.ts
	modified:   src/test/competitionDrawEligibilityService.test.ts
	modified:   src/test/dataAccessAdapter.test.ts
	modified:   src/test/document-engine/baseos/generateInspectionPdfs.test.ts
	modified:   src/test/fase32IntegrityAndSecurity.test.ts
	modified:   src/test/setup.ts
	modified:   src/test/teamRegistrationFlow.test.ts
	modified:   src/types/competitionConfig.ts
	modified:   src/types/registration.ts

Arquivos não monitorados:
  (utilize "git add <arquivo>..." para incluir o que será submetido)
	docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md
	docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md
	docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA.md
	docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-1.md
	docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md
	docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO.md
	docs/audits/FASE-8.3-IMPLEMENTACAO-MAPPERS-P0-FLUXO-OPERACIONAL-PARTE-1.md
	docs/audits/FASE-8.3-IMPLEMENTACAO-MAPPERS-P0-FLUXO-OPERACIONAL-PARTE-2.md
	docs/walkthroughs/FASE-8-FUNCTIONAL-AUDIT-V2.3.0.md
	docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md
	docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md
	docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA.md
	docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-1.md
	docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md
	docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO.md
	docs/walkthroughs/FASE-8.3-IMPLEMENTACAO-MAPPERS-P0-FLUXO-OPERACIONAL-PARTE-1.md
	docs/walkthroughs/FASE-8.3-IMPLEMENTACAO-MAPPERS-P0-FLUXO-OPERACIONAL-PARTE-2.md
	docs/walkthroughs/FASE-8.4-UX-OPERACIONAL-HELP-CENTER.md
	src/components/competition/CompetitionActionGuideCard.tsx
	src/services/competitionActionGuideService.ts
	src/services/mappers/
	src/test/canonicalMappers.test.ts
	src/test/competitionActionGuideService.test.ts
	src/test/dataAccessErrorHandling.test.ts
	src/test/fase83OperationalFlow.test.ts

nenhuma modificação adicionada à submissão (utilize "git add" e/ou "git commit -a")
```

### 8.4 Testes Realizados
* **TypeScript Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` — 0 erros.
* **ESLint:** `npm run lint` — 0 erros.
* **Vitest:** `npm test` — 116 arquivos e 1.117 testes aprovados (100% de sucesso).
* **Build de Produção:** `npm run build` — compilação bem-sucedida em 3m 52s.

### 8.5 Confirmação de Produção
* **A produção VOLTZ permaneceu 100% intocada.**
* Nenhum push, deploy, tag ou release foi gerado.

```text
===================================================================
FASE 8.4 — STATUS: IMPLEMENTATION COMPLETE
===================================================================
```
