# BASEOS — PHASE 11 POST-MERGE AUDIT

**Data:** 15 de setembro de 2026  
**Ambiente:** Desenvolvimento (`docker/volei`)  
**Repositório:** `diegoantmartins/volleyscore-hub`  
**Branch de Destino:** `main`  
**Branch de Origem (PR):** `codex/corrige-a-fundacao-do-baseos` (Pull Request #2 — MERGED & CLOSED)  
**Status do Ambiente:** Sincronizado, Auditado, Validado e Compilando (1263 testes Vitest passando, 0 erros TypeScript, 0 erros ESLint, Build 100% OK)  

---

## 1. Executive Summary

A branch `codex/corrige-a-fundacao-do-baseos` foi submetida a Pull Request (#2) contra a branch `main`, aprovada e mesclada com sucesso no commit `08c0ce9`.

A sincronização local foi executada com segurança estrita:
1. Inspeção preliminar do Git e das referências locais/remotas;
2. Salvaguarda do trabalho local legítimo (Fase 10 / hardening de segurança) criando a branch de backup `backup/local-pre-phase-11-merge` no commit `30b681a` e exportando o patch das alterações locais não commitadas;
3. Atualização via `git fetch --all --prune`;
4. Fast-forward merge via `git merge --ff-only origin/main` para o commit `08c0ce9`;
5. Nenhuma alteração local foi destruída ou revertida.

O PR entregou a **Fase 11.1 (Fundação Aditiva de Identidade)** conforme planejado no design arquitetural:
- Schema SQL aditivo com tabelas `organizations`, `athletes` e `user_memberships`, além de FKs aditivas nullable em `teams`, `competitions` e `competition_athletes`;
- Tipos de domínio em `src/types/identity.ts`;
- Serviços puros de domínio: `identityService.ts`, `identityBackfillService.ts` e `membershipService.ts`;
- Suporte inicial no adapter de dados (`dataAccess.ts`) com `listUserMemberships` e `createUserMembership` para LocalStorage e Supabase;
- Testes unitários dedicados em `src/test/identityMembershipService.test.ts`.

Nenhum fluxo legado em produção ou desenvolvimento foi quebrado. A suíte completa de testes do Vitest executou com **100% de aprovação (123 arquivos, 1263 testes)**, o typecheck do TypeScript registrou **0 erros**, o ESLint registrou **0 erros** e o build do Vite foi concluído com sucesso.

**Veredito:** `READY WITH CONDITIONS` (Pronto para avançar, com condições técnicas catalogadas nos achados deste relatório).

---

## 2. Git State Before Synchronization

Antes de qualquer operação de sincronização, o repositório foi inspecionado detalhadamente:

- **Branch Atual:** `main`
- **Commit Local:** `30b681a` (Tags: `v2.4.1`, `v2.4.1-rc.1`)
- **Mensagem do Commit:** `chore(release): BaseOS v2.4.1 - Estabilização TypeScript do Portal da Equipe e Pacote de Promoção`
- **Remotes Configurados:**
  - `origin https://github.com/diegoantmartins/volleyscore-hub.git (fetch)`
  - `origin https://github.com/diegoantmartins/volleyscore-hub.git (push)`
- **Estado da Working Tree:**
  - Alterações não commitadas (modificadas):
    - `src/App.tsx` (rotas do Portal Unificado da Equipe — Fase 10)
    - `src/components/auth/RequireAuth.tsx` (redirecionamento de segurança por perfil — Fase 10)
  - Arquivos não monitorados (untracked):
    - `docs/walkthroughs/FASE-10-PORTAL-UNIFICADO.md`
    - `docs/walkthroughs/FASE-9.8-PUBLICACAO-v2.4.1.md`
    - `docs/walkthroughs/FASE-9.9-SEGURANCA-GESTOR-EQUIPE.md`
    - `docs/walkthroughs/RELEASE-v2.4.0-PUBLICACAO.md`
    - `src/components/portal/` (`PortalRouter.tsx`, `TeamPortalGuard.tsx`, `TeamPortalLayout.tsx`, `useTeamPortal.ts`)
    - `src/pages/portal/` (`TeamPortalPage.tsx`)
    - `src/test/portalRoutingAndSecurity.test.ts`
    - `src/test/teamRoleAuthorizationSecurity.test.ts`
    - `supabase/migrations/20260914180000_restrict_role_based_write_policies.sql`
    - `supabase/migrations/20260914190000_harden_match_referee_authorization.sql`
- **Ação de Salvaguarda:** Criação da branch local `backup/local-pre-phase-11-merge` no commit `30b681a` e exportação do patch de diferenças para o diretório de auditoria antes da sincronização.

---

## 3. Git State After Synchronization

A sincronização foi realizada com `git fetch --all --prune` seguido de `git merge --ff-only origin/main`:

- **Branch Atual:** `main` (rastreando `origin/main`)
- **Commit Atual:** `08c0ce967903b2465ea89c2e9ce5b24dca1097b5`
- **Ancestral Comum (merge-base):** `30b681a36bafe541472960837f87cd292a4331ad`
- **Divergência:** 0 commits atrás, 0 commits à frente de `origin/main`
- **Integridade da Working Tree:** Todas as modificações locais de `src/App.tsx`, `src/components/auth/RequireAuth.tsx` e arquivos untracked permaneceram 100% intactas, sem qualquer perda ou conflito de merge.

---

## 4. Merge/PR Identified

- **Pull Request:** #2
- **Título do PR:** `Phase 11: Add identity foundation (organizations, athletes, memberships), services and migration`
- **Branch de Origem do PR:** `codex/corrige-a-fundacao-do-baseos` (`origin/codex/corrige-a-fundacao-do-baseos`)
- **Branch de Destino:** `main` (`origin/main`)
- **Commit de Merge:** `08c0ce9`
- **Data do Merge:** 15 de setembro de 2026 às 15:37:40 -0300
- **Status no Remoto:** MERGED e CLOSED com sucesso.

---

## 5. Commits Incorporated

1. **Commit `cbba0a3`** (na branch do PR `codex/corrige-a-fundacao-do-baseos`):
   - Mensagem: `feat(membership): persist memberships through data access`
   - Autor: `diegoantmartins`
   - Conteúdo: Criação dos documentos de auditoria, schema DDL, types de identidade, serviços de domínio e integração do dataAccess com testes unitários.
2. **Commit `08c0ce9`** (na branch `main`):
   - Mensagem: `Merge pull request #2 from diegoantmartins/codex/corrige-a-fundacao-do-baseos`
   - Pai 1: `30b681a` (Head anterior da `main`)
   - Pai 2: `cbba0a3` (Head do PR)

---

## 6. Files Changed

Total de 9 arquivos envolvidos (662 inserções, 1 deleção):

| Status | Arquivo | Linhas | Descrição Técnica |
|---|---|---|---|
| **Adicionado** | `PHASE_11_AUDIT.md` | +178 | Documento formal de auditoria inicial, mapeamento Current vs Target, riscos, gaps e plano em etapas da Fase 11 |
| **Modificado** | `src/lib/supabaseClient.ts` | +2 | Adição das chaves `userMemberships: 'user_memberships'` e `athletes: 'athletes'` ao objeto `SUPABASE_TABLES` |
| **Modificado** | `src/services/dataAccess.ts` | +35, -1 | Implementação de `listUserMemberships` e `createUserMembership` no `localStorageAdapter` e `supabaseAdapter` |
| **Adicionado** | `src/services/identityBackfillService.ts` | +78 | Motor puro de planejamento de backfill determinístico para atletas e dirigentes legados |
| **Adicionado** | `src/services/identityService.ts` | +26 | Normalização canônica de CPF (11 dígitos numéricos) e busca em lista de identidades |
| **Adicionado** | `src/services/membershipService.ts` | +63 | Resolução de contexto ativo, lista de memberships ativas e seleção de contexto pós-login |
| **Adicionado** | `src/test/identityMembershipService.test.ts` | +97 | 6 testes unitários cobrindo normalização de CPF, backfill determinístico e resolução de contexto |
| **Adicionado** | `src/types/identity.ts` | +49 | Tipos TypeScript: `AthleteIdentity`, `UserMembership`, `ActiveContext`, `MembershipRole`, `MembershipStatus` |
| **Adicionado** | `supabase/migrations/20260915000001_phase_11_identity_foundation.sql` | +139 | Migration aditiva DDL: tabelas `organizations`, `athletes`, `user_memberships`, índices e FKs |

---

## 7. Database Changes

A migration `supabase/migrations/20260915000001_phase_11_identity_foundation.sql` foi projetada para ser **estritamente aditiva e não destrutiva**:

### Tabelas Novas Criadas
1. **`public.organizations`**
   - `id TEXT PRIMARY KEY`
   - `name TEXT NOT NULL CHECK (btrim(name) <> '')`
   - `legal_name TEXT`
   - `document_number TEXT`
   - `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'archived'))`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
2. **`public.athletes`**
   - `id TEXT PRIMARY KEY`
   - `normalized_cpf TEXT`
   - `name TEXT NOT NULL CHECK (btrim(name) <> '')`
   - `birth_date DATE`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - Constraint: `athletes_normalized_cpf_format CHECK (normalized_cpf IS NULL OR normalized_cpf ~ '^[0-9]{11}$')`
   - Índice único parcial: `uq_athletes_normalized_cpf ON athletes (normalized_cpf) WHERE normalized_cpf IS NOT NULL`
3. **`public.user_memberships`**
   - `id TEXT PRIMARY KEY`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT`
   - `organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT`
   - `competition_id TEXT REFERENCES public.competitions(id) ON DELETE RESTRICT`
   - `team_id TEXT REFERENCES public.teams(id) ON DELETE RESTRICT`
   - `competition_team_id TEXT REFERENCES public.competition_teams(id) ON DELETE RESTRICT`
   - `role TEXT NOT NULL CHECK (role IN ('admin', 'organizer', 'team_manager', 'referee', 'scorer', 'viewer'))`
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked', 'ended'))`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Colunas e Chaves Estrangeiras Aditivas
- `public.teams.organization_id TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT` (nullable)
- `public.teams.gender_category public.gender_category` (nullable)
- `public.competitions.organization_id TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT` (nullable)
- `public.competition_athletes.athlete_id TEXT REFERENCES public.athletes(id) ON DELETE RESTRICT` (nullable)

### Índices Criados
- `uq_teams_organization_gender` em `teams (organization_id, gender_category)` WHERE `organization_id IS NOT NULL AND gender_category IS NOT NULL`
- `idx_teams_organization` em `teams (organization_id)` WHERE `organization_id IS NOT NULL`
- `idx_competitions_organization` em `competitions (organization_id)` WHERE `organization_id IS NOT NULL`
- `idx_competition_athletes_athlete` em `competition_athletes (athlete_id)` WHERE `athlete_id IS NOT NULL`
- `idx_user_memberships_user_status` em `user_memberships (user_id, status)`
- `idx_user_memberships_organization` em `user_memberships (organization_id)`
- `idx_user_memberships_competition` em `user_memberships (competition_id)` WHERE `competition_id IS NOT NULL`
- `idx_user_memberships_team` em `user_memberships (team_id)` WHERE `team_id IS NOT NULL`
- `idx_user_memberships_competition_team` em `user_memberships (competition_team_id)` WHERE `competition_team_id IS NOT NULL`

---

## 8. Identity Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** O usuário é uma pessoa humana (`auth.users` / `profiles`), única no sistema, não recriada por equipe ou competição.
- **Estado Atual Merged:**
  - O schema agora permite que o usuário possua N registros em `user_memberships`, desvinculando a autorização de um único `profiles.competition_team_id`.
  - O tipo `UserMembership` e o serviço `membershipService.ts` implementam o filtro de memberships ativas por `userId`.
  - **Atenção:** `authService.ts` ainda lê `profile.competition_team_id` no momento do login e injeta no `AuthSession.user.competitionTeamId`. Essa ponte legada permanece ativa até a migração do fluxo de autenticação.

---

## 9. Organization Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** `Organization` representa a entidade proprietária/mantenedora que gerencia equipes e/ou competições.
- **Estado Atual Merged:**
  - Tabela `organizations` criada no banco com status (`active`, `blocked`, `archived`) e identificadores.
  - As tabelas `teams` e `competitions` possuem FKs aditivas para `organizations(id)`.
  - **Gaps Identificados:**
    - `src/types/entities.ts` e `src/types/registration.ts` ainda não possuem a interface `OrganizationRecord`.
    - `dataAccess.ts` não expõe métodos para criar ou listar organizações.
    - O seed do sistema ainda não cria uma organização padrão de demonstração.

---

## 10. Team Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** Uma equipe (`teams`) é uma entidade persistente ao longo do tempo (ex: "Clube X Masculino"). Ela não deve ser duplicada a cada novo campeonato.
- **Estado Atual Merged:**
  - O índice único parcial `uq_teams_organization_gender (organization_id, gender_category)` protege a identidade de equipes por organização e categoria, impedindo a criação de dois "Clube X Masculino" sob a mesma organização quando associados.
  - A participação em torneios é mediada por `competition_teams`.
  - O dirigente não é mais um campo fixo na equipe (`managerName`), sendo modelado como `UserMembership` com papel `team_manager`.
  - **Compatibilidade:** `TeamRecord` ainda retém as propriedades opcionais `managerName`, `managerEmail` e `managerPhone` no frontend para exibição e relatórios legados.

---

## 11. Competition Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** Representa a edição/torneio específico.
- **Estado Atual Merged:**
  - `competitions` agora possui `organization_id` como FK aditiva.
  - `competition_teams` continua sendo a tabela canônica de relacionamento entre `teams` e `competitions`.
  - Mantém o `access_token` e `registration_deadline` no nível de participação (`competition_teams`), preservando o fluxo de convite online.

---

## 12. Athlete Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** Atleta é uma identidade global única, identificada por CPF normalizado (quando informado), que não deve ser duplicada ao mudar de equipe ou participar de novas edições.
- **Estado Atual Merged:**
  - Tabela `athletes` criada no banco com `normalized_cpf` (índice único parcial onde não nulo) e validação de 11 dígitos.
  - `competition_athletes` recebeu a coluna `athlete_id REFERENCES public.athletes(id) ON DELETE RESTRICT`.
  - `identityService.ts` implementa `normalizeCpf` e `findAthleteByCpf`.
  - `identityBackfillService.ts` implementa o algoritmo `planAthleteBackfill`, que gera identidades sem duplicar por CPF e trata atletas sem documento sem mesclá-los indevidamente por nome.
  - **Gaps Identificados:**
    - `CompetitionAthlete` em `src/types/registration.ts` ainda não inclui `athleteId?: string`.
    - `registrationService.ts` ainda insere diretamente em `competition_athletes` sem buscar ou vincular a identidade em `athletes`.
    - `dataAccess.ts` ainda não possui métodos para consultar ou criar `AthleteIdentity`.

---

## 13. Membership Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** Relação histórica de acesso de um usuário a uma organização, competição ou equipe.
- **Estado Atual Merged:**
  - Tabela `user_memberships` criada com ciclo de vida: `pending`, `active`, `blocked`, `ended`.
  - Papéis mapeados: `admin`, `organizer`, `team_manager`, `referee`, `scorer`, `viewer`.
  - Coluna de compatibilidade `competition_team_id` presente na membership para autorização precisa no portal durante a fase de transição.
  - `dataAccess.ts` implementa `listUserMemberships` e `createUserMembership` em LocalStorage e Supabase.

---

## 14. Active Context Architecture

### Arquitetura Alvo vs Implementação Merged
- **Conceito:** O contexto ativo deve ser selecionado a partir de memberships ativas válidas do usuário autenticado:
  ```text
  User -> Memberships -> Valid Active Contexts -> Active Context
  ```
- **Estado Atual Merged:**
  - `src/types/identity.ts` define o tipo `ActiveContext`.
  - `membershipService.ts` fornece as funções puras:
    - `listActiveMemberships`: filtra apenas memberships com `status === 'active'`;
    - `toActiveContext`: mapeia uma membership ativa para contexto;
    - `resolveInitialContext`: retorna o contexto se houver exatamente 1 ativo, ou `null` se houver 0 ou mais de 1;
    - `selectActiveContext`: valida se o `membershipId` pertence ao usuário antes de autorizar.
  - **Gaps Identificados:**
    - O frontend (`PortalRouter.tsx`, `TeamPortalGuard.tsx`) ainda não consome `membershipService`. O redirecionamento atual depende diretamente de `session.user.competitionTeamId`.
    - Ainda não existe o componente visual de Seletor de Contexto (Context Selector Modal/Page).

---

## 15. Portal Architecture

- **/dashboard (Organizador):** 100% operacional. Protegido por `RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}`.
- **/portal/equipe (Portal da Equipe):** Operacional através da implementação da Fase 10 (`TeamPortalGuard` + `TeamPortalLayout` + `TeamPortalPage`), lendo `session.user.competitionTeamId`. O código merged do Codex preparou a base para que ele consuma `ActiveContext`, mas não alterou os componentes visuais.
- **/publico/:competition e /c/:slug:** 100% funcionais, totalmente públicos e sem login.
- **Portais Especiais:** Nenhum portal separado para árbitros foi criado, mantendo a regra de que árbitros e apontadores continuam acessando a gestão operacional de partidas conforme histórico.

---

## 16. RLS/Security Audit

A auditoria de segurança das migrations revelou um **ponto crítico que exige atenção imediata**:

```sql
-- Linhas 137 a 139 de 20260915000001_phase_11_identity_foundation.sql:
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
```

### Análise de Impacto:
1. **Bloqueio Padrão do RLS:** No PostgreSQL / Supabase, quando o RLS é ativado em uma tabela e **nenhuma política (POLICY)** é criada, a política padrão é **DENY ALL** para todas as conexões autenticadas ou anônimas (exceto conexões com a role `service_role` ou superusuário).
2. **Impacto no `dataAccess.ts`:**
   - O método `supabaseAdapter.listUserMemberships(userId)` faz:
     ```ts
     await supabase.from('user_memberships').select('*').eq('user_id', userId);
     ```
   - Como o cliente do navegador utiliza a `VITE_SUPABASE_ANON_KEY` com o JWT do usuário logado, essa consulta retornará **0 linhas** (ou erro de permissão RLS) no Supabase real até que uma policy `SELECT WHERE user_id = auth.uid()` seja criada.
3. **Políticas Existentes de Equipe:**
   - As policies de gravação em `competition_teams` e `competition_athletes` (definidas na migration `20260914180000_restrict_role_based_write_policies.sql`) ainda consultam `profiles.competition_team_id`. Elas não foram tocadas pelo PR, o que garante que o fluxo legado continua funcionando, mas as novas tabelas ainda estão isoladas.
4. **Vetor de Adulteração de Contexto:**
   - O design do `membershipService.ts` impede a manipulação de contexto no cliente: `selectActiveContext` valida se a membership pertence ao `userId` e está ativa.

---

## 17. Migration Audit

A migration `20260915000001_phase_11_identity_foundation.sql` foi auditada em detalhes:

- **Idempotência:** Todas as instruções utilizam `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` e `CREATE UNIQUE INDEX IF NOT EXISTS`.
- **Compatibilidade Cronológica:** O timestamp `20260915000001` posiciona a migration imediatamente após as migrations de 14/09 (`20260914180000` e `20260914190000`), sem conflitos de versionamento.
- **Tipos Customizados:** A instrução `ADD COLUMN IF NOT EXISTS gender_category public.gender_category` reutiliza o tipo ENUM `public.gender_category` que já existia no banco desde a migration inicial (`20260818000000_initial_schema.sql`).
- **Integridade Referencial:** Todas as novas FKs utilizam `ON DELETE RESTRICT`, impedindo a deleção acidental de organizações ou identidades de atletas caso haja referências ativas em equipes ou participações.
- **Não Destrutiva:** Nenhuma tabela ou coluna foi removida, renomeada ou alterada para `NOT NULL` sem valor padrão.

---

## 18. Compatibility Audit

1. **Links de Convite por Token:**
   - `/equipe/:token` e `/equipe/inscricao/:token` continuam mapeados em `src/App.tsx` para `TeamRosterRegistrationPage`.
   - `competition_teams.access_token` permanece intacto e funcional.
2. **Elencos e Inscrições Existentes:**
   - `registrationService.ts` opera normalmente, pois `competition_athletes.athlete_id` é nullable.
   - Nenhuma equipe ou atleta existente em banco tem suas consultas quebradas.
3. **Autenticação:**
   - O login atual por Supabase Auth e o modo Demo local permanecem operando com `profiles.competition_team_id` sem interrupção de serviço.

---

## 19. Test Results

- **Execução:** `npm test -- --run`
- **Ferramenta:** Vitest v2.1.9
- **Ambiente:** jsdom
- **Resultados:**
  - **Arquivos de Teste:** 123 aprovados de 123 (100%)
  - **Testes Unitários/Integração:** 1263 aprovados de 1263 (100%)
  - **Testes Falhos:** 0
  - **Tempo de Execução:** 303.88s
- **Testes Específicos da Fase 11 (`src/test/identityMembershipService.test.ts`):** 6 testes cobrindo normalização de CPF, validação de formato, resolução de contexto único, seletor de contextos múltiplos, bloqueio de memberships inválidas e plano determinístico de backfill.

---

## 20. TypeScript Results

- **Comando:** `npx tsc -p tsconfig.app.json --noEmit`
- **Resultado:** **0 erros**.
- Todos os novos tipos em `src/types/identity.ts` e as extensões em `src/services/dataAccess.ts` compilam estritamente sem erros de tipagem.

---

## 21. ESLint Results

- **Comando:** `npm run lint` (`eslint .`)
- **Resultado:** **0 erros**, 1 warning.
- **Warning registrado (pré-existente):**
  - `src/components/draw/cinematic/DrawArenaCanvas.tsx:438:6`: `react-hooks/exhaustive-deps` (dependência 'team' no useMemo).
- Todos os arquivos novos e modificados pelo PR estão com **0 erros e 0 warnings**.

---

## 22. Build Results

- **Comando:** `npm run build` (`vite build`)
- **Resultado:** Concluído com sucesso em 57.11s.
- Todos os pacotes e chunks de produção (`dist/`) foram gerados sem erros, validando a integridade das importações e referências.

---

## 23. Functional Scenarios

Matriz de auditoria dos 12 cenários funcionais obrigatórios:

| Cenário | Descrição | Status Atual | Detalhes Técnicos |
|---|---|---|---|
| **Caso 1** | Um usuário possui uma equipe | **Coberto** | Testado em `identityMembershipService.test.ts` (`resolveInitialContext` direciona automaticamente). |
| **Caso 2** | Um usuário possui duas equipes | **Parcial (Serviço)** | `resolveInitialContext` retorna `null` para exigir seletor; `selectActiveContext` funciona no teste unitário. Falta UI do seletor. |
| **Caso 3** | Um usuário possui equipes masculina e feminina | **Parcial (Serviço)** | Coberto pelo teste unitário com `team-male` e `team-female`. Schema suporta via `gender_category`. Falta UI. |
| **Caso 4** | A mesma equipe participa de duas competições | **Parcial (Schema)** | Suportado pelo schema `teams` e `competition_teams`. Falta teste de ponta a ponta com persistência no adapter. |
| **Caso 5** | O manager muda entre competições | **Parcial (Backfill)** | Coberto pelo algoritmo `planLegacyTeamMembership`. Falta tela de troca de dirigente. |
| **Caso 6** | O atleta existe por CPF e é reutilizado | **Parcial (Serviço)** | `findAthleteByCpf` e `planAthleteBackfill` funcionam. `registrationService` ainda não foi conectado a `athletes`. |
| **Caso 7** | Atleta muda de equipe em outra competição | **GAP** | Ainda não implementado no fluxo de inscrição. Requer vincular nova `competition_athletes` ao mesmo `athlete_id`. |
| **Caso 8** | Histórico antigo permanece intacto | **GAP** | `AthletesPage` ainda permite editar a linha histórica de `competition_athletes`. Precisa proibir mutação histórica. |
| **Caso 9** | Usuário não acessa equipe sem membership | **Coberto (Serviço)** | `selectActiveContext` rejeita context de outro usuário. Falta RLS policy correspondente no banco. |
| **Caso 10** | Contexto inválido não concede autorização | **Coberto (Serviço)** | Memberships bloqueadas/encerradas não geram contexto ativo no serviço. Falta RLS policy no banco. |
| **Caso 11** | Portal público continua funcionando | **Coberto** | `/c/:slug` continua consumindo `publicCompetitionService` sem login. Testes passando. |
| **Caso 12** | Convites antigos continuam funcionando | **Coberto** | `/equipe/inscricao/:token` funcional através de `TeamRosterRegistrationPage`. Testes passando. |

---

## 24. Findings

Classificação formal dos achados identificados na auditoria técnica:

### [P1] RLS Ativado sem Políticas em `user_memberships`, `athletes` e `organizations`
- **Gravidade:** P1 (Crítico para a integração com Supabase)
- **Local:** `supabase/migrations/20260915000001_phase_11_identity_foundation.sql:137-139`
- **Problema:** As novas tabelas tiveram o RLS ativado sem a criação de nenhuma policy. Qualquer consulta executada via cliente Supabase autenticado resultará em bloqueio (0 registros retornados).
- **Ação Necessária no Bloco 11.3/11.5:** Criar policies de leitura e escrita seguras (ex: `user_memberships` legível por `user_id = auth.uid()`).

### [P1] Falta de Métodos para `athletes` e `organizations` no `dataAccess.ts`
- **Gravidade:** P1 (Bloqueador para o fluxo de cadastro e reutilização de atletas)
- **Local:** `src/services/dataAccess.ts`
- **Problema:** Apenas `user_memberships` recebeu métodos no `dataAccess`. Não há métodos para buscar atleta por CPF (`findAthleteByCpf`), criar atleta ou gerenciar organizações no adapter.
- **Ação Necessária no Bloco 11.3:** Adicionar métodos de busca e criação de `athletes` com paridade LocalStorage/Supabase.

### [P2] Inscrição de Atletas ainda não Vincula `athletes.id`
- **Gravidade:** P2 (Importante para a fundação)
- **Local:** `src/services/registrationService.ts`
- **Problema:** O formulário de cadastro de elenco grava diretamente em `competition_athletes` sem preencher `athlete_id`. O atleta continua sendo uma identidade local da participação.
- **Ação Necessária no Bloco 11.4:** Integrar `registrationService` para buscar por CPF antes de criar a participação.

### [P2] Roteamento de Portais ainda depende de `profiles.competition_team_id`
- **Gravidade:** P2 (Importante para múltiplos contextos)
- **Local:** `src/components/portal/PortalRouter.tsx` e `src/components/portal/TeamPortalGuard.tsx`
- **Problema:** O roteamento ignora `membershipService` e assume que cada usuário possui no máximo uma equipe gravada no perfil.
- **Ação Necessária no Bloco 11.5:** Conectar `PortalRouter` a `resolveInitialContext` e construir a tela do Seletor de Contextos.

### [P2] Ausência de Dados de Demonstração (Seed) para Memberships
- **Gravidade:** P2 (Importante para modo demo e testes locais)
- **Local:** `src/data/seed.ts`
- **Problema:** `src/data/seed.ts` não inicializa `user_memberships` nem `athletes`. Em modo LocalStorage, a coleção inicia vazia.
- **Ação Necessária no Bloco 11.2:** Adicionar dados de semente para memberships das equipes de demonstração.

### [P3] `organizations` Ausente em `SUPABASE_TABLES`
- **Gravidade:** P3 (Melhoria de consistência)
- **Local:** `src/lib/supabaseClient.ts:41-63`
- **Problema:** `SUPABASE_TABLES` contém `userMemberships` e `athletes`, mas não possui a chave `organizations`.

---

## 25. Risks

1. **Risco de Acesso no Supabase Real:** Tentar ler `user_memberships` em ambiente com Supabase ativo falhará silenciosamente até que a migration de policies de RLS seja aplicada.
2. **Risco de Tratamento de CPF (LGPD):** CPF é dado pessoal sensível. A busca por CPF e a exibição em listas públicas de elenco devem assegurar que apenas os 3 primeiros e 2 últimos dígitos sejam exibidos (mascaramento), nunca o CPF completo em views abertas.
3. **Risco de Concorrência em Inscrição:** Se dois dirigentes cadastrarem simultaneamente o mesmo CPF em equipes diferentes na mesma competição, a constraint de unicidade de `athletes` impedirá duplicação de identidade, mas o sistema precisa de regras claras de elegibilidade (atleta não pode jogar por duas equipes no mesmo torneio).
4. **Risco de Dual-Read/Dual-Write:** Enquanto `profiles.competition_team_id` coexistir com `user_memberships`, uma atualização que sincronize apenas um dos locais criará inconsistência de acesso.

---

## 26. Gaps

- [ ] Ausência de tela/modal de **Seletor de Contexto Ativo** quando o usuário possui múltiplos vínculos.
- [ ] Ausência de UI administrativa para visualização de organizações e membros.
- [ ] Ausência de script de backfill automatizado executável para migrar os dados atuais de `profiles` para `user_memberships`.
- [ ] Ausência de bloqueio na UI de `AthletesPage` para impedir mover uma linha de atleta entre equipes no passado.

---

## 27. Recommended Next Steps

Recomenda-se dividir a continuação da Fase 11 nos seguintes blocos ordenados:

### Bloco 11.2 — Dados de Demonstração e Backfill Local
1. Adicionar `organizations`, `athletes` e `user_memberships` ao `src/data/seed.ts` para garantir paridade completa no modo LocalStorage e testes E2E.
2. Criar teste de integração para o algoritmo de backfill em dados reais de demonstração.

### Bloco 11.3 — Extensão do DataAccess e RLS Mínimo
1. Incluir `organizations` em `SUPABASE_TABLES`.
2. Adicionar métodos `getAthleteByCpf`, `createAthlete`, `listAthletes` e `listOrganizations` em `src/services/dataAccess.ts` (LocalStorage + Supabase).
3. Criar migration `20260915120000_phase_11_initial_rls_policies.sql` concedendo permissões estritas de `SELECT` para `user_memberships` (`auth.uid() = user_id`) e `athletes` autenticados.

### Bloco 11.4 — Integração da Inscrição com Identidade Global
1. Atualizar `CompetitionAthlete` em `src/types/registration.ts` para aceitar `athleteId?: string`.
2. Atualizar `registrationService.ts` para consultar `dataAccess.getAthleteByCpf` antes de criar o registro de participação em `competition_athletes`.

### Bloco 11.5 — Contexto Ativo e Seletor no Portal
1. Criar componente visual `ContextSelectorModal` ou `/portal/selecionar-contexto`.
2. Conectar `PortalRouter.tsx` e `TeamPortalGuard.tsx` ao `membershipService.ts`.

---

## 28. Final Verdict

# `READY WITH CONDITIONS`

### Justificativa:
O trabalho do PR #2 (`codex/corrige-a-fundacao-do-baseos`) cumpriu com rigor o objetivo da Fase 11.1:
- A fundação aditiva foi mesclada perfeitamente na `main`;
- 100% dos testes existentes continuam passando (1263 testes aprovados);
- Typecheck e Lint com zero erros;
- Build de produção totalmente funcional;
- Nenhum código legado foi quebrado.

**Condições antes de iniciar novas telas ou fluxos de negócio:**
1. Não realizar chamadas diretas do Supabase para `user_memberships` ou `athletes` até a criação das policies mínimas de RLS (Finding P1);
2. Implementar os métodos de acesso a dados para `athletes` no `dataAccess.ts` antes de tentar integrá-los no `registrationService` (Finding P1);
3. Manter a ponte de compatibilidade com `profiles.competition_team_id` ativa até a homologação completa do Seletor de Contextos.
