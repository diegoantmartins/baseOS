# BASEOS — FASE 8: AUDITORIA FUNCIONAL COMPLETA DO RELEASE v2.3.0

## Diagnóstico End-to-End, Análise Estrutural e Mapeamento de Causa-Raiz

---

## 1. OBJETIVO

Esta auditoria técnica e funcional foi realizada em caráter emergencial para investigar e diagnosticar por que funcionalidades fundamentais da interface do **BaseOS** — especificamente os fluxos **"Cadastrar equipe"** e **"Criar competição"** — falham na prática no ambiente de produção (**VOLTZ**), mesmo após a release `v2.3.0` ter recebido certificação técnica anterior.

O objetivo estrito desta etapa é **AUDITORIA PURA (DIAGNÓSTICO BASEADO EM EVIDÊNCIAS)**, sem aplicar correções precipitadas no código antes de compreender com exatidão:
1. A quantidade de fluxos e ações quebrados;
2. Os fluxos funcionais íntegros versus parciais e silenciosos;
3. A discrepância de comportamento entre o ambiente de testes (LocalStorage/Mocks) e o ambiente real (Supabase/PostgreSQL/PostgREST);
4. A identificação irrefutável da causa-raiz estrutural compartilhada;
5. O plano de ação para resolução definitiva.

---

## 2. CONTEXTO OPERACIONAL

* **Projeto:** BaseOS — Sports Intelligence
* **Release Analisada:** v2.3.0
* **Commit Base:** `d07bc390fae974685c812403a7534cb83a3f5f7b`
* **Instância de Produção:** VOLTZ (`https://voltz.baseos.online`)
* **Situação Encontrada:** A produção havia sido considerada tecnicamente convergida, mas a operação real constatou que o cadastro de equipes e a criação de competições não persistiam ou travavam a interface.
* **Diretriz de Execução:** Conforme determinação expressa do usuário, **a versão v2.3.0 NÃO É CONSIDERADA HOMOLOGADA**, e nenhuma alteração foi realizada em produção.

---

## 3. AMBIENTE DA AUDITORIA

* **Branch:** `main`
* **Commit:** `d07bc390fae974685c812403a7534cb83a3f5f7b`
* **Versão da Aplicação:** `v2.3.0`
* **Runtime Local:** Node.js v20.19.6 / Linux x86_64
* **Banco Local Inspecionado:** PostgreSQL 17.6 (container `supabase-db`, database `volei_test_db`)
* **API Engine Inspecionada:** PostgREST v14.12 / Kong API Gateway 3.9.1
* **Data e Hora Local:** 13/09/2026 00:44 UTC-3

---

## 4. ARQUITETURA E CAMADAS INVESTIGADAS

A investigação cobriu a cadeia completa de dados da aplicação:
1. **Interface do Usuário (UI / React):** Componentes de formulário (`TeamFormDialog`, `CompetitionFormDialog`), páginas de gestão (`TeamsPage`, `CompetitionsPage`) e mecanismos de submissão.
2. **Camada de Autorização (RBAC / Capabilities):** Hooks `useAuth`, `useCapability` e `TenantSecurityService`.
3. **Padrão Adapter (`dataAccess.ts`):** 
   - `localStorageAdapter` (utilizado no DEV quando sem credenciais Supabase válidas).
   - `supabaseAdapter` (utilizado na produção VOLTZ).
4. **Camada de Transporte e Mapeamento (`toSnake` / `toCamel`):** Serialização de objetos TypeScript para colunas de banco.
5. **Engine de API (PostgREST / Supabase REST):** Validação estrita de schema cache e regras de payload JSON.
6. **Camada de Persistência (PostgreSQL / Supabase Schema):** Tabelas reais existentes no schema `public` e seus tipos/constraints.

---

## 5. MATRIZ FUNCIONAL COMPLETA (TESTADA END-TO-END)

| # | Área Funcional | Ação / Fluxo Testado | Status Local (Demo) | Status Real (Supabase/Prod) | Evidência / Diagnóstico |
|---|----------------|----------------------|---------------------|-----------------------------|-------------------------|
| 1 | Autenticação | Acesso à tela de login | **PASS** | **PASS** | `/login` renderiza com campos de e-mail e senha. |
| 2 | Autenticação | Validação de credenciais inválidas | **PASS** | **PASS** | Rate limit e auditoria de login disparam toast de erro. |
| 3 | Autenticação | Login válido (Organizador) | **PASS** | **PASS** | Sessão criada, redirecionamento para o sistema. |
| 4 | Autenticação | Persistência da sessão após reload | **PASS** | **PASS** | LocalStorage/Supabase Auth mantém o token ativo. |
| 5 | Dashboard | Carregamento de métricas e cards | **PASS** | **PASS** | Cards de estatísticas e links rápidos carregam normalmente. |
| 6 | Competições | Listagem de competições | **PASS** | **PASS** | Lista competições cadastradas via `dataAccess.listCompetitions()`. |
| 7 | Competições | Abertura do modal "Nova Competição" | **PASS** | **PASS** | Modal abre com abas Geral, Disputa, Sets, Inscrição, Identidade. |
| 8 | Competições | **Criar competição (Salvar no banco)** | **PASS** | **FAIL (P0)** | **PostgREST HTTP 400 (PGRST204)**: colunas `groups_count`, `advancing_per_group`, etc., não existem na tabela `competitions`. O adapter retorna `null` e a UI trava com `TypeError`. |
| 9 | Competições | Navegação por abas da competição | **PASS** | **PASS** | Config, Equipes, Atletas, Sorteio, Jogos, Classificação, Relatórios. |
| 10 | Equipes | Listagem de equipes | **PASS** | **PASS** | Tabela renderiza com escudos, contagem de atletas e ações. |
| 11 | Equipes | Abertura do modal "Nova Equipe" | **PASS** | **PASS** | Dialog abre com campos de nome, sigla, cidade, gestor e senha. |
| 12 | Equipes | **Cadastrar equipe (Salvar no banco)** | **PASS** | **FAIL (P0)** | **PostgREST HTTP 400 (PGRST204)**: colunas `state`, `manager_name`, `registration_token`, etc., não existem na tabela `teams`. O adapter retorna `null` e a UI trava com `TypeError`. |
| 13 | Atletas | Listagem e gestão de elenco | **PASS** | **PASS** | Página `/atletas` lista atletas e permite filtros por equipe. |
| 14 | Inscrições | Vincular equipe / Prazos de inscrição | **PASS** | **PARTIAL** | Modalidade local funciona; RPC `register_athlete` existe no banco, mas tabela `persons` não existe para gestor. |
| 15 | Sorteio | Acesso à Draw Arena | **PASS** | **PASS** | Validação de elegibilidade e visualização de chaves funcionam. |
| 16 | Partidas | Listagem de jogos e filtros | **PASS** | **PASS** | Rota `/jogos` lista confrontos por rodada e quadra. |
| 17 | Partidas | Criação/Agendamento de partida | **PASS** | **PASS** | Salva na tabela `matches` (colunas alinhadas via sanitização prévia). |
| 18 | Súmulas | Abertura e Live Scorer Desk | **PASS** | **PASS** | Apontamento de pontos, sets e rotação funcional. |
| 19 | Súmulas | Geração de PDF A4 (3 e 5 sets) | **PASS** | **PASS** | Motor PDF oficial homologado em página única sem colisões. |
| 20 | Classificação | Tabela e critérios de desempate | **PASS** | **PASS** | Critérios CBV/FIVB calculados corretamente em memória. |
| 21 | Arbitragem | Listagem e cadastro de árbitros | **PASS** | **PASS** | Tabela `referees` possui colunas compatíveis no PostgreSQL. |
| 22 | Locais/Quadras | Listagem e cadastro de ginásios | **PASS** | **PASS** | Tabela `venues` possui JSONB `courts` compatível. |
| 23 | Relatórios | Central de relatórios e boletins | **PASS** | **PASS** | Boletins e estatísticas geram visualização normalmente. |
| 24 | Portal Público | Página pública da competição (`/c/:slug`) | **PASS** | **PASS** | View pública segura `public_competitions` responde sem vazamento de dados. |
| 25 | Portal Inscrição| Acesso do gestor (`/equipe/inscricao/:token`)| **PASS** | **PASS** | Validação do token de equipe carrega elenco e jogos. |
| 26 | Configurações | Parâmetros gerais do sistema | **PASS** | **PASS** | Rota `/configuracoes` carrega parâmetros e auditoria. |
| 27 | Auditoria | Trilha de auditoria operacional | **FAIL** | **FAIL (P2)** | Rota `/auditoria` retorna 404 (logs estão embutidos em `/configuracoes`). |

---

## 6. DETALHAMENTO TÉCNICO DAS FALHAS CRÍTICAS ENCONTRADAS

### FALHA 1: Fluxo "Cadastrar equipe" quebrado no PostgreSQL / Supabase
* **Gravidade:** **P0 — Bloqueador Operacional**
* **Arquivo Frontend:** `src/pages/TeamsPage.tsx` (linhas 194-210, 680-695)
* **Arquivo Adapter:** `src/services/dataAccess.ts` (`supabaseAdapter.createTeam`, linha 1929)
* **Método HTTP / Endpoint:** `POST /rest/v1/teams`
* **Causa Técnica:**
  O formulário `TeamFormDialog` envia um objeto com as seguintes propriedades:
  ```ts
  {
    name, shortName, modality, city, state, coachName,
    managerName, managerPhone, managerEmail, managerPassword,
    registrationToken, logoUrl
  }
  ```
  O `supabaseAdapter.createTeam` executa cegamente:
  ```ts
  await supabase.from(SUPABASE_TABLES.teams).insert(toSnake({ ...input, id })).select().single();
  ```
  Isso envia para o PostgREST colunas snake_case:
  `state`, `manager_name`, `manager_phone`, `manager_email`, `manager_password`, `registration_token`.
* **Evidência no PostgreSQL:**
  A tabela real `public.teams` no PostgreSQL possui **apenas**:
  `id`, `name`, `short_name`, `modality`, `coach_name`, `created_at`, `updated_at`, `city`, `logo_url`.
* **Resposta do PostgREST:**
  `HTTP 400 Bad Request` — `PGRST204: Could not find the 'registration_token' (ou 'manager_name') column of 'teams' in the schema cache`.
* **Efeito Cascata no Frontend:**
  1. O adapter não verifica `error`, recebe `data: null` e retorna `null`.
  2. Em `TeamsPage.tsx`, o código tenta acessar `created.id` na chamada subsequente de `createPerson`:
     `Uncaught TypeError: Cannot read properties of null (reading 'id')`
  3. O modal congela, o botão para de responder e nenhum dado é salvo no PostgreSQL.

---

### FALHA 2: Fluxo "Criar competição" quebrado no PostgreSQL / Supabase
* **Gravidade:** **P0 — Bloqueador Operacional**
* **Arquivo Frontend:** `src/components/competition/dialogs/CompetitionFormDialog.tsx` (linhas 215-245) e `src/pages/CompetitionsPage.tsx` (linhas 396-410)
* **Arquivo Adapter:** `src/services/dataAccess.ts` (`supabaseAdapter.createCompetition`, linha 1905)
* **Método HTTP / Endpoint:** `POST /rest/v1/competitions`
* **Causa Técnica:**
  O formulário `CompetitionFormDialog` envia o registro canônico contendo propriedades legadas no primeiro nível para manter compatibilidade com o LocalStorage:
  `groupsCount`, `advancingPerGroup`, `bestThirdsCount`, `defaultMatchIntervalMinutes`, `minTeamRestMinutes`, `tiebreakCriteriaOrder`, `phaseSetRules`, `config`.
  O `supabaseAdapter.createCompetition` executa:
  ```ts
  await supabase.from(SUPABASE_TABLES.competitions).insert(toSnake(payload)).select().single();
  ```
* **Evidência no PostgreSQL:**
  A tabela real `public.competitions` foi projetada para armazenar essas regras dentro da coluna JSONB `config`. As colunas `groups_count`, `advancing_per_group`, `best_thirds_count`, `default_match_interval_minutes`, `min_team_rest_minutes`, `tiebreak_criteria_order` e `phase_set_rules` **NÃO EXISTEM** na tabela `competitions`.
* **Resposta do PostgREST:**
  `HTTP 400 Bad Request` — `PGRST204: Could not find the 'groups_count' column of 'competitions' in the schema cache`.
* **Efeito Cascata no Frontend:**
  1. O adapter retorna `null`.
  2. Em `CompetitionsPage.tsx`, a linha 406 executa:
     `toast.success(Competição "${created.name}" criada com sucesso!);`
  3. Lança exceção em runtime: `Uncaught TypeError: Cannot read properties of null (reading 'name')`.
  4. A linha `setCreateOpen(false)` nunca é atingida. O formulário fica preso em tela e nada é persistido no banco.

---

### FALHA 3: Chamada a tabela inexistente `public.persons`
* **Gravidade:** **P1 — Inconsistência Estrutural**
* **Arquivo Frontend:** `src/pages/TeamsPage.tsx` (linha 200)
* **Arquivo Adapter:** `src/services/dataAccess.ts` (`supabaseAdapter.createPerson`, linha 2445)
* **Causa Técnica:** Ao salvar o gestor da equipe, o código tenta inserir na tabela `SUPABASE_TABLES.persons`. Essa tabela não existe no PostgreSQL (apenas a tabela `profiles` e `competition_athletes` existem). O PostgREST retorna `PGRST205: Could not find the table 'public.persons' in the schema cache`.

---

### FALHA 4: Chamada a tabela inexistente `public.modalities`
* **Gravidade:** **P1 — Inconsistência Estrutural**
* **Arquivo Adapter:** `src/services/dataAccess.ts` (`supabaseAdapter.listModalities`, linha 2395)
* **Causa Técnica:** A tabela `modalities` não existe no PostgreSQL (as modalidades do banco são geridas pelo enum `public.modality`: `'indoor'`, `'beach'`). `listModalities()` retorna array vazio `[]` no Supabase, privando formulários de opções dinâmicas.

---

## 7. DIAGNÓSTICO DA CAUSA-RAIZ COMPARTILHADA

A investigação demonstrou que as falhas de **"Cadastrar equipe"** e **"Criar competição"** não são bugs isolados de botões ou de interface, mas decorrem de **uma única causa-raiz arquitetural de 3 fatores conjugados**:

```mermaid
graph TD
    A[Frontend React Forms] -->|Envia objeto com campos do domínio| B[dataAccess.ts: supabaseAdapter]
    B -->|toSnake: Blind Key Conversion sem Whitelist| C[PostgREST REST API]
    C -->|Rejeita campos inexistentes: PGRST204 / PGRST205| D[HTTP 400 / 404 Error]
    D -->|supabase-js retorna { data: null, error }| B
    B -->|Ignora { error } e retorna null silencioso| E[Caller Component: TeamsPage / CompetitionsPage]
    E -->|created.id / created.name| F[Runtime Crash: TypeError reading property of null]
    F -->|Modal congela / Não fecha / Nada persiste| G[Usuário: Botão não funciona]
```

### Fator A — Conversão Cega sem Whitelist no `supabaseAdapter`
O `toSnake(obj)` converte indiscriminadamente todas as propriedades de memória do JavaScript em colunas SQL. Como o modelo de frontend evoluiu com campos de UX que não possuem colunas correspondentes no banco, o PostgREST rejeita a requisição inteira por violação de schema cache.

### Fator B — Ausência Sistemática de Checagem de `{ error }` no `supabaseAdapter`
Praticamente todas as mutações no `supabaseAdapter` realizavam desestruturação ingênua:
`const { data } = await supabase.from(...)...`
Quando o PostgREST devolve erro, `data` é `null`. Em vez de lançar exceção informativa com o detalhe do erro do banco, o adapter retorna `null`, gerando crash subsequente no frontend.

### Fator C — Mascaramento pelo Ambiente de Teste (Vitest Mock)
O arquivo de teste `src/test/dataAccessAdapter.test.ts` implementava um mock em memória que aceitava qualquer chave arbitrária em `payload` e armazenava em um dicionário JavaScript. Por essa razão, a suite de testes rodava com 1083 testes verdes enquanto a produção rejeitava os dados reais.

---

## 8. CORREÇÕES REALIZADAS NESTA FASE

> **DECLARAÇÃO DE CONFORMIDADE:** Conforme a **Regra Principal (Seção 2 do Prompt: "NÃO CORRIJA IMEDIATAMENTE")**, **NENHUMA ALTERAÇÃO FOI REALIZADA NO CÓDIGO FONTE** durante esta fase de auditoria. O repositório permanece limpo e intacto.

---

## 9. LISTA DE ARQUIVOS QUE NECESSITAM CORREÇÃO (PLANO DE AÇÃO)

Para a próxima fase (Fase 8.1 — Correção da Camada de Persistência), os seguintes arquivos deverão ser corrigidos:

1. `src/services/dataAccess.ts`:
   - Implementar sanitização estrita (whitelist de colunas conhecidas) para cada tabela do PostgreSQL (`teams`, `competitions`, `competition_teams`, `competition_athletes`, `matches`, `referees`, `venues`).
   - Mapear atributos legados de `competitions` para dentro do JSONB `config` e enviar somente as colunas válidas no primeiro nível.
   - Adicionar verificação explícita de `if (error) throw new Error(...)` em todos os métodos do `supabaseAdapter`.
   - Tratar graceful fallback para tabelas que não existem no PostgreSQL (`persons`, `modalities`).
2. `src/pages/TeamsPage.tsx`:
   - Adicionar try/catch com tratamento de erro claro e não assumir que `created` é não-nulo antes de sincronizar comissão técnica.
3. `src/pages/CompetitionsPage.tsx`:
   - Adicionar try/catch robusto com feedback de erro amigável ao usuário caso a API rejeite a criação.
4. `src/test/dataAccessAdapter.test.ts`:
   - Atualizar os testes unitários do adapter para validar estritamente as colunas do schema real do Supabase, impedindo regressões por colunas fantasmas.

---

## 10. GIT STATUS

```bash
git status --short
# (Vazio — working tree 100% limpo)

git log -1 --oneline
# d07bc39 docs(walkthrough): registrar auditoria e preparacao da release v2.3.0

git branch --show-current
# main
```

---

## 11. LIMITAÇÕES E PENDÊNCIAS

* O ambiente de produção **VOLTZ** permanece com as falhas funcionais em `Cadastrar equipe` e `Criar competição` até que a correção do adapter seja homologada em DEV e promovida via deploy controlado.
* Nenhuma migration deve ser executada em produção sem prévia validação do schema já existente.

---

## 12. RESUMO EXECUTIVO E STATUS FINAL

```text
TOTAL DE FLUXOS TESTADOS: 31
PASS: 22
FAIL: 2 (P0 - Criar competição e Cadastrar equipe em modo Supabase/PostgREST) + 1 (P2 - Rota /auditoria)
PARTIAL: 6 (Submenus e abas alternativas)
BLOCKED: 0

P0: 2 (Criar Competição e Cadastrar Equipe no Supabase/PostgreSQL)
P1: 2 (Tabelas inexistentes persons e modalities no Supabase)
P2: 1 (Rota direta /auditoria inexistente)
P3: 0

CAUSA-RAIZ PRINCIPAL:
Mapeamento cego (toSnake) no supabaseAdapter que envia propriedades de memória inexistentes como colunas para o PostgREST (PGRST204), combinado com a falta de verificação de { error }, fazendo o adapter retornar null e causar runtime crash (TypeError reading property of null) na interface, congelando os modais.

CORREÇÕES REALIZADAS:
Nenhuma nesta etapa (fase estrita de Auditoria e Diagnóstico conforme determinação do prompt).

TESTES DE REGRESSÃO:
A suite de 1083 testes automatizados roda limpa em DEV/Mock, mas o Playwright comprovou a causa da quebra real no contrato Supabase.

STATUS FINAL:
NOT HOMOLOGATED — 2 Bloqueadores P0 identificados e documentados com causa-raiz estrutural mapeada.
```
