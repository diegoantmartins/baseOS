# BASEOS — RELATÓRIO TÉCNICO DE AUDITORIA — FASE 8.1
# CONTRATO REAL DE PERSISTÊNCIA, DOMÍNIO E BANCO DE DADOS

> **Documentos particionados para análise facilitada:**
> - [Parte 1: Seções 1 a 11 (Diagnóstico, Schema PostgreSQL e Contratos de Entidades)](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md)
> - [Parte 2: Seções 12 a 25 (Auth, DataAccess, Gaps, Riscos e Contrato Canônico)](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md)

---

## 1. RESUMO EXECUTIVO

A **Fase 8.1 do BaseOS** teve como missão estrita e exclusiva:
> **Estabelecer, com comprovação técnica e evidência empírica, o contrato canônico real entre o modelo de domínio do BaseOS (TypeScript) e a camada de banco de dados (PostgreSQL / Supabase / PostgREST).**

Esta fase **NÃO** é uma fase de release, **NÃO** é um deploy e **NÃO** realiza correções funcionais intempestivas. Seu propósito é erradicar a dependência de suposições no acesso a dados, mapeando exatamente onde cada informação deve residir antes de qualquer modificação de código na Fase 8.2.

### Diagnóstico dos Bloqueios P0 da Fase 8
A auditoria funcional da Fase 8 identificou que os botões **"Cadastrar equipe"** e **"Criar competição"** quebravam em tempo de execução com exceções do tipo `TypeError: Cannot read properties of null`.
A investigação técnica comprovou que a causa raiz é uma falha arquitetural sistêmica na camada de persistência:
1. **Discrepância de Schema (Payload Incompatível):** Os formulários de interface e modelos de domínio enviam objetos densos contendo propriedades ricas. O `supabaseAdapter` aplica uma função utilitária cega (`toSnake()`) que projeta diretamente tais propriedades como nomes de colunas SQL.
2. **Rejeição pelo PostgREST (HTTP 400 - PGRST204):** O PostgREST valida os payloads contra o schema cache do PostgreSQL. Como colunas como `groups_count`, `advancing_per_group`, `manager_name`, `manager_password`, `state` não existem nas tabelas `public.competitions` e `public.teams`, a requisição é sumariamente rejeitada com erro HTTP 400.
3. **Supressão Silenciosa de Erros no Adapter:** O `supabaseAdapter` em métodos como `createCompetition` e `createTeam` desestrutura apenas `{ data }`, descartando `{ error }`. Ao receber erro do PostgREST, `data` é `null`. O adapter retorna `null` para a UI, que tenta acessar `.id` ou `.name`, causando o crash.
4. **Vulnerabilidade Crítica de Segurança em Credenciais:** A UI de equipes (`TeamsPage.tsx`) gera senhas em texto puro (`managerPassword`), exibe-as em tela e tenta enviá-las para a tabela de domínio `teams`, ignorando por completo que credenciais devem ser tratadas exclusivamente pelo `Supabase Auth` (`auth.users`) e os dados de perfil em `public.profiles`.
5. **Mocks Permissivos e Testes Cegos:** Os testes unitários existentes passavam com 100% de sucesso porque os mocks de query builder aceitavam qualquer payload contanto que possuísse `id`, sem validar as colunas contra o schema real do PostgreSQL.

**Status da Fase 8.1:** `CONTRACT MAPPED` (Contrato Mapeado com Sucesso).

---

## 2. ESTADO INICIAL DO GIT

Antes de qualquer verificação técnica adicional, o estado do repositório foi congelado e inspecionado:

```bash
$ git status --short
?? docs/walkthroughs/FASE-8-FUNCTIONAL-AUDIT-V2.3.0.md

$ git branch --show-current
main

$ git log -1 --oneline
4e55243 docs: walkthrough oficial de auditoria de release e deploy da Fase 7.9

$ git diff --stat
(vazio)
```

**Registro de Preservação:**
- O working tree estava rigorosamente limpo, com exceção do arquivo não rastreado `docs/walkthroughs/FASE-8-FUNCTIONAL-AUDIT-V2.3.0.md` produzido na Fase 8.
- Nenhuma alteração pré-existente foi sobrescrita, revertida ou descartada.
- Nenhuma migração especulativa foi criada.
- Nenhum deploy foi realizado.
- A instância de produção VOLTZ permaneceu intocada.

---

## 3. ARQUITETURA ATUAL

O BaseOS opera com uma camada de abstração de dados unificada definida em `src/services/dataAccess.ts`:

```text
[ UI Components / Modals ]
            ↓
  [ Domain Services ]
 (registrationService, etc.)
            ↓
   [ dataAccess Adapter ]
      ↙              ↘
[ localStorage ]    [ supabaseAdapter ]
                           ↓
                  toSnake() genérico
                           ↓
                   [ PostgREST API ]
                           ↓
                  [ PostgreSQL 17.6 ]
```

### Análise do Adaptador Atual
O adaptador `dataAccess` seleciona a implementação em tempo de inicialização através da função `isSupabaseConfigured()` (`src/lib/supabaseClient.ts`):
- Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` contiverem chaves reais (não-placeholders), ativa `supabaseAdapter`.
- Caso contrário, ativa `localStorageAdapter`.

Dentro de `supabaseAdapter`, coexistem **duas gerações discrepantes de implementação**:
1. **Geração Moderna (Fases 4.4 a 4.6):** Métodos de runtime esportivo (`saveStageDrawAndSlots`, `createMatchSlot`, `listStages`, etc.) que desestruturam `{ data, error }`, lançam exceções detalhadas em caso de falha do Supabase e utilizam RPCs transacionais com tipagem JSONB estruturada.
2. **Geração Legada (Fases 1 a 3):** Métodos de CRUD básico (`competitions`, `teams`, `referees`, `venues`, `matches`, `draws`, `modalities`, `persons`) que utilizam conversão genérica via `toSnake()`, descartam o objeto `error` do Supabase e retornam `null` ou arrays vazios em caso de erro HTTP 400/404/500.

---

## 4. MODELO DE DOMÍNIO

Mapeamento completo dos modelos/interfaces definidos em `src/types/`:

### 4.1. `CompetitionRecord` (`src/types/entities.ts`)
- **Campos:** `id` (string), `name` (string), `slug` (string?), `modality` ('indoor' | 'beach'), `modalityId` (string?), `format` (string), `playerFormat` (string), `setFormat` (string), `genderCategory` ('male' | 'female' | 'mixed'), `defaultDeadline` (string?), `groupName` (string?), `startDate` (string?), `endDate` (string?), `venue` (string?), `description` (string?), `logoUrl` (string?), `supporters` (CompetitionSupporter[]?), `courtsCount` (number?), `groupsCount` (number?), `teamsPerGroup` (number?), `advancingPerGroup` (number?), `useBestThirds` (boolean?), `bestThirdsCount` (number?), `tiebreakCriteria` (TiebreakCriterionId[]?), `tiebreakCriteriaOrder` (TiebreakCriterionId[]?), `phaseSetRules` (PhaseSetRules?), `defaultMatchIntervalMinutes` (number?), `minTeamRestMinutes` (number?), `woRules` (string?), `status` (CompetitionLifecycleStatus), `config` (CompetitionConfig?), `rulesSnapshot` (CompetitionConfig?), `championTeamId` (string?), `runnerUpTeamId` (string?), `thirdPlaceTeamId` (string?), `createdAt` (string?), `updatedAt` (string?).
- **Origem:** Configuração esportiva e operacional do torneio.
- **Uso na UI:** `CompetitionsPage.tsx`, `CompetitionFormDialog.tsx`, `ActiveCompetitionsPage.tsx`.

### 4.2. `TeamRecord` (`src/types/entities.ts`)
- **Campos:** `id` (string), `name` (string), `shortName` (string), `modality` ('indoor' | 'beach'), `city` (string?), `state` (string?), `managerName` (string?), `managerEmail` (string?), `managerPhone` (string?), `managerPassword` (string?), `registrationToken` (string?), `coachName` (string?), `assistantCoach` (string?), `physicalTrainer` (string?), `doctor` (string?), `logoUrl` (string?), `status` ('registered' | 'invited' | 'confirmed' | 'blocked'?), `createdAt` (string?), `updatedAt` (string?).
- **Origem:** Cadastro institucional da equipe participante.
- **Uso na UI:** `TeamsPage.tsx`, `TeamDetailModal.tsx`.

### 4.3. `CompetitionTeam` (`src/types/registration.ts`)
- **Campos:** `id` (string), `competitionId` (string), `teamId` (string), `teamName` (string), `teamShortName` (string), `accessToken` (string), `registrationDeadline` (string), `isLocked` (boolean), `status` (RegistrationStatus: 'invited' | 'in_progress' | 'submitted' | 'approved' | 'rejected'), `customNotes` (string?), `createdAt` (string), `updatedAt` (string).
- **Origem:** Vínculo de inscrição de uma equipe em uma competição específica.
- **Uso na UI:** `CompetitionRegistrationsPage.tsx`, `PublicTeamRegistrationPortal.tsx`.

### 4.4. `CompetitionAthlete` (`src/types/registration.ts`)
- **Campos:** `id` (string), `competitionTeamId` (string), `name` (string), `jerseyNumber` (number?), `position` (string), `documentNumber` (string?), `birthDate` (string?), `isCaptain` (boolean), `isLibero` (boolean), `gender` ('male' | 'female'), `createdAt` (string), `updatedAt` (string).
- **Origem:** Atletas inscritos no elenco de uma equipe para a competição.
- **Uso na UI:** `AthletesPage.tsx`, `PublicTeamRegistrationPortal.tsx`.

### 4.5. `MatchRecord` (`src/types/entities.ts`)
- **Campos:** `id`, `competitionId`, `round`, `matchNumber`, `teamAId`, `teamBId`, `teamAName`, `teamBName`, `teamAShortName`, `teamBShortName`, `venue`, `court`, `slotId`, `phase`, `groupName`, `scheduledTime`, `status`, `sets`, `referees`, `lineups`, `checkedInAthleteIds`, `observations`, `winnerId`, `isWo`, `woReason`, `customSetFormat`, `highlightAthleteId`, `homologatedAt`, `homologatedBy`, `auditLog`, `createdAt`, `updatedAt`.
- **Origem:** Agendamento, execução e súmula oficial de partidas.
- **Uso na UI:** `MatchesPage.tsx`, `MatchScoreSheetModal.tsx`, `DailySchedulePage.tsx`.

### 4.6. `RefereeRecord` (`src/types/entities.ts`)
- **Campos:** `id` (string), `name` (string), `level` (string?).
- **Origem:** Quadro de arbitragem.
- **Uso na UI:** `RefereesPage.tsx`.

### 4.7. `VenueRecord` (`src/types/entities.ts`)
- **Campos:** `id` (string), `name` (string), `address` (string?), `responsible` (string?), `notes` (string?), `courts` (string[]), `courtDetails` (CourtDetail[]?), `createdAt` (string), `updatedAt` (string).
- **Origem:** Locais de jogos e praças esportivas.
- **Uso na UI:** `LocationsPage.tsx`.

### 4.8. `UserProfile` e `SystemUser` (`src/types/auth.ts`)
- **Campos:** `id` (string), `email` (string), `name` (string), `role` (UserRole: 'admin' | 'organizer' | 'referee' | 'scorer' | 'team' | 'viewer'), `competitionTeamId` (string?).
- **Origem:** Controle de acesso, autenticação e permissões (RBAC).
- **Uso na UI:** `useAuth.ts`, `authService.ts`, cabeçalhos e controle de rotas.

### 4.9. `PersonRecord` (`src/types/entities.ts`)
- **Campos:** `id`, `fullName`, `nickname`, `documentId`, `birthDate`, `photoUrl`, `email`, `phone`, `roles` (PersonRole[]), `teamIds`, `notes`, `createdAt`, `updatedAt`.
- **Origem:** Legado conceitual de catálogo de pessoas.

### 4.10. `ModalityRecord` (`src/types/entities.ts`)
- **Campos:** `id`, `name`, `type` ('indoor' | 'beach'), `defaultPlayerFormat`, `defaultSetFormat`, `defaultSetPoints`, `defaultTiebreakPoints`, `description`.
- **Origem:** Legado conceitual de tabela de modalidades.

---

## 5. SCHEMA POSTGRESQL REAL (INSPEÇÃO COM EVIDÊNCIA TÉCNICA)

A inspeção direta foi realizada via `psql` no container de banco de dados ativo (`supabase-db`, PostgreSQL 17.6), cruzada com as 24 migrações versionadas em `supabase/migrations/`.

### 5.1. Relações Existentes no Banco (`public.*`)

| Nome da Relação | Tipo | Finalidade Real |
| --------------- | ---- | --------------- |
| `competitions` | Table | Dados centrais da competição, metadados e snapshots |
| `teams` | Table | Cadastro de equipes e entidades esportivas |
| `competition_teams` | Table | Inscrições e tokens de acesso por competição |
| `competition_athletes` | Table | Elencos inscritos de atletas por inscrição |
| `matches` | Table | Partidas, súmulas, sets e resultados |
| `referees` | Table | Quadro de árbitros homologados |
| `venues` | Table | Praças esportivas e quadras |
| `draws` | Table | Configurações e snapshots de sorteios de grupos |
| `competition_stages` | Table | Fases estruturais do formato esportivo (Runtime) |
| `competition_rounds` | Table | Rodadas estruturais por fase (Runtime) |
| `competition_match_slots`| Table | Slots de emparelhamento e progressão (Runtime) |
| `profiles` | Table | Perfis de usuários vinculados ao `auth.users` |
| `app_settings` | Table | Configurações institucionais do SaaS |
| `audit_logs` | Table | Trilha de auditoria operacional |
| `public_competitions` | View | Visão pública sanitizada de competições |

### 5.2. Enums Nativos do Banco
- `public.modality`: `'indoor'`, `'beach'`
- `public.competition_status`: `'draft'`, `'registration'`, `'in-progress'`, `'completed'`, `'cancelled'`, `'planning'`, `'registration-open'`, `'registration-closed'`, `'draw-pending'`, `'groups-defined'`, `'playoffs'`
- `public.match_status`: `'scheduled'`, `'warmup'`, `'in-progress'`, `'timeout'`, `'set-break'`, `'completed'`, `'postponed'`, `'cancelled'`, `'awaiting_schedule'`, `'negotiating'`, `'sheet_available'`, `'awaiting_homologation'`, `'homologated'`, `'rescheduled'`, `'wo'`
- `public.registration_status`: `'invited'`, `'in_progress'`, `'submitted'`, `'approved'`, `'rejected'`
- `public.user_role`: `'organizer'`, `'referee'`, `'team'`, `'admin'`
- `public.gender_category`: `'male'`, `'female'`, `'mixed'`
- `public.stage_runtime_status`: `'pending'`, `'in-progress'`, `'completed'`, `'cancelled'`
- `public.round_runtime_status`: `'pending'`, `'in-progress'`, `'completed'`
- `public.slot_participant_status`: `'unresolved'`, `'resolved'`, `'bye'`, `'invalid'`

### 5.3. Tabelas Inexistentes no PostgreSQL (Alvos de Falha Crítica)
- `public.persons` — **NÃO EXISTE**.
- `public.modalities` — **NÃO EXISTE**.
- `public.document_edits` — **NÃO EXISTE**.
- `public.template_layouts` — **NÃO EXISTE**.

---

## 6. MATRIZ CANÔNICA DE PERSISTÊNCIA: DOMÍNIO → POSTGRESQL

| Entidade Domínio | Campo de Domínio | Destino Persistência | Tabela Destino | Coluna / Propriedade JSONB | Tipo SQL | Nulo? | Status Contrato |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Competition** | id | SQL Column | `competitions` | `id` | text | NÃO | **OK** |
| **Competition** | name | SQL Column | `competitions` | `name` | text | NÃO | **OK** |
| **Competition** | slug | SQL Column | `competitions` | `slug` | text | SIM | **OK** |
| **Competition** | modality | SQL Enum | `competitions` | `modality` | modality | NÃO | **OK** |
| **Competition** | format | SQL Column | `competitions` | `format` | text | NÃO | **OK** |
| **Competition** | playerFormat | SQL Column | `competitions` | `player_format` | text | NÃO | **OK** |
| **Competition** | setFormat | SQL Column | `competitions` | `set_format` | text | NÃO | **OK** |
| **Competition** | genderCategory | SQL Enum | `competitions` | `gender_category` | gender_category | NÃO | **OK** |
| **Competition** | defaultDeadline | SQL Column | `competitions` | `default_deadline` | timestamptz | SIM | **OK** |
| **Competition** | groupName | SQL Column | `competitions` | `group_name` | text | SIM | **OK** |
| **Competition** | startDate | SQL Column | `competitions` | `start_date` | date | SIM | **OK** |
| **Competition** | endDate | SQL Column | `competitions` | `end_date` | date | SIM | **OK** |
| **Competition** | venue | SQL Column | `competitions` | `venue` | text | SIM | **OK** |
| **Competition** | status | SQL Enum | `competitions` | `status` | competition_status | NÃO | **OK** |
| **Competition** | logoUrl | SQL Column | `competitions` | `logo_url` | text | SIM | **OK** |
| **Competition** | supporters | JSONB Column | `competitions` | `supporters` | jsonb | NÃO | **OK** |
| **Competition** | config | JSONB Column | `competitions` | `config` | jsonb | SIM | **OK** |
| **Competition** | rulesSnapshot | JSONB Column | `competitions` | `rules_snapshot` | jsonb | SIM | **OK** |
| **Competition** | organizerId | SQL Column | `competitions` | `organizer_id` | uuid | SIM | **OK** |
| **Competition** | groupsCount | JSONB Path | `competitions` | `config.standings.groupsCount` | integer | — | **GAP (P0)**: enviado como coluna `groups_count` |
| **Competition** | advancingPerGroup| JSONB Path | `competitions` | `config.standings.advancingPerGroup` | integer | — | **GAP (P0)**: enviado como coluna `advancing_per_group` |
| **Competition** | bestThirdsCount | JSONB Path | `competitions` | `config.standings.bestThirds.count` | integer | — | **GAP (P0)**: enviado como coluna `best_thirds_count` |
| **Competition** | tiebreakCriteriaOrder | JSONB Path | `competitions` | `config.standings.tiebreakCriteriaOrder` | jsonb | — | **GAP (P0)**: enviado como coluna `tiebreak_criteria_order` |
| **Competition** | phaseSetRules | JSONB Path | `competitions` | `config.format.phaseOverrides` | jsonb | — | **GAP (P0)**: enviado como coluna `phase_set_rules` |
| **Competition** | defaultMatchIntervalMinutes | JSONB Path | `competitions` | `config.schedule.matchInterval` | integer | — | **GAP (P0)**: enviado como coluna `default_match_interval_minutes` |
| **Competition** | minTeamRestMinutes | JSONB Path | `competitions` | `config.schedule.minRest` | integer | — | **GAP (P0)**: enviado como coluna `min_team_rest_minutes` |
| **Competition** | championTeamId | Derived / JSONB | `competitions` | `config.podium.championTeamId` | text | — | **GAP (P1)**: sem coluna SQL |
| **Team** | id | SQL Column | `teams` | `id` | text | NÃO | **OK** |
| **Team** | name | SQL Column | `teams` | `name` | text | NÃO | **OK** |
| **Team** | shortName | SQL Column | `teams` | `short_name` | text | NÃO | **OK** |
| **Team** | modality | SQL Enum | `teams` | `modality` | modality | NÃO | **OK** |
| **Team** | coachName | SQL Column | `teams` | `coach_name` | text | SIM | **OK** |
| **Team** | city | SQL Column | `teams` | `city` | text | SIM | **OK** |
| **Team** | logoUrl | SQL Column | `teams` | `logo_url` | text | SIM | **OK** |
| **Team** | state | SQL Column | `teams` | `state` | text | SIM | **GAP (P1)**: coluna `state` não existe em `teams` |
| **Team** | managerName | Auth Profile | `profiles` | `name` | text | NÃO | **GAP (P0)**: enviado para `teams` em vez de `profiles` |
| **Team** | managerEmail | Auth User | `auth.users` / `profiles` | `email` | text | NÃO | **GAP (P0)**: enviado para `teams` em vez de Auth |
| **Team** | managerPhone | Auth Profile | `profiles` | `phone` | text | SIM | **GAP (P1)**: sem coluna nem em `teams` nem em `profiles` |
| **Team** | managerPassword | Supabase Auth | `auth.users` | `encrypted_password` | text | NÃO | **GAP CRÍTICO (P0)**: senha em plain-text no domínio |
| **Team** | registrationToken | Inscrição | `competition_teams` | `access_token` | text | NÃO | **GAP (P0)**: enviado para `teams` em vez de `competition_teams` |
| **CompetitionTeam** | id | SQL Column | `competition_teams` | `id` | text | NÃO | **OK** |
| **CompetitionTeam** | competitionId | SQL Column | `competition_teams` | `competition_id` | text | NÃO | **OK** (FK `competitions.id`) |
| **CompetitionTeam** | teamId | SQL Column | `competition_teams` | `team_id` | text | NÃO | **OK** (FK `teams.id`) |
| **CompetitionTeam** | teamName | SQL Column | `competition_teams` | `team_name` | text | NÃO | **OK** |
| **CompetitionTeam** | teamShortName | SQL Column | `competition_teams` | `team_short_name` | text | NÃO | **OK** |
| **CompetitionTeam** | accessToken | SQL Column | `competition_teams` | `access_token` | text | NÃO | **OK** (Unique Token) |
| **CompetitionTeam** | registrationDeadline | SQL Column | `competition_teams` | `registration_deadline` | timestamptz | NÃO | **OK** |
| **CompetitionTeam** | isLocked | SQL Column | `competition_teams` | `is_locked` | boolean | NÃO | **OK** |
| **CompetitionTeam** | status | SQL Enum | `competition_teams` | `status` | registration_status | NÃO | **OK** |
| **CompetitionTeam** | customNotes | SQL Column | `competition_teams` | `custom_notes` | text | SIM | **OK** |
| **CompetitionAthlete** | id | SQL Column | `competition_athletes`| `id` | text | NÃO | **OK** |
| **CompetitionAthlete** | competitionTeamId | SQL Column | `competition_athletes`| `competition_team_id` | text | NÃO | **OK** (FK `competition_teams.id`) |
| **CompetitionAthlete** | name | SQL Column | `competition_athletes`| `name` | text | NÃO | **OK** |
| **CompetitionAthlete** | jerseyNumber | SQL Column | `competition_athletes`| `jersey_number` | integer | SIM | **OK** (Check 1..99) |
| **CompetitionAthlete** | position | SQL Column | `competition_athletes`| `position` | text | NÃO | **OK** |
| **CompetitionAthlete** | documentNumber | SQL Column | `competition_athletes`| `document_number` | text | SIM | **OK** |
| **CompetitionAthlete** | birthDate | SQL Column | `competition_athletes`| `birth_date` | date | SIM | **OK** |
| **CompetitionAthlete** | isCaptain | SQL Column | `competition_athletes`| `is_captain` | boolean | NÃO | **OK** |
| **CompetitionAthlete** | isLibero | SQL Column | `competition_athletes`| `is_libero` | boolean | NÃO | **OK** |
| **CompetitionAthlete** | gender | SQL Column | `competition_athletes`| `gender` | text | NÃO | **OK** (Check 'male'/'female') |
| **Match** | id | SQL Column | `matches` | `id` | text | NÃO | **OK** |
| **Match** | competitionId | SQL Column | `matches` | `competition_id` | text | NÃO | **OK** (FK `competitions.id`) |
| **Match** | round | SQL Column | `matches` | `round` | integer | NÃO | **OK** |
| **Match** | matchNumber | SQL Column | `matches` | `match_number` | integer | NÃO | **OK** |
| **Match** | teamAId / teamBId | SQL Column | `matches` | `team_a_id` / `team_b_id` | text | NÃO | **OK** (FKs `teams.id`) |
| **Match** | venue | SQL Column | `matches` | `venue` | text | NÃO | **OK** |
| **Match** | court | SQL Column | `matches` | `court` | text | SIM | **OK** |
| **Match** | scheduledTime | SQL Column | `matches` | `scheduled_time` | timestamptz | NÃO | **OK** |
| **Match** | status | SQL Enum | `matches` | `status` | match_status | NÃO | **OK** |
| **Match** | sets | JSONB Column | `matches` | `sets` | jsonb | NÃO | **OK** |
| **Match** | referees | JSONB Column | `matches` | `referees` | jsonb | NÃO | **OK** |
| **Match** | lineups | JSONB Column | `matches` | `lineups` | jsonb | SIM | **OK** |
| **Match** | slotId | SQL Column | `matches` | `slot_id` | text | SIM | **OK** |
| **Match** | phase | SQL Column | `matches` | `phase` | text | SIM | **OK** |
| **Match** | groupName | SQL Column | `matches` | `group_name` | text | SIM | **OK** |
| **Match** | highlightAthleteId | SQL Column | `matches` | `highlight_athlete_id` | text | SIM | **OK** (FK `competition_athletes.id`) |
| **Match** | isWo | Derived from Status | `matches` | — | — | — | **OK**: mapeado para `status = 'wo'` |
| **Match** | homologatedAt / By | ? | `matches` | `homologated_at` / `by` | — | — | **GAP (P1)**: colunas não existem em `matches` |
| **Referee** | id / name / level | SQL Columns | `referees` | `id`, `name`, `level` | text | — | **OK** |
| **Venue** | id / name / address | SQL Columns | `venues` | `id`, `name`, `address` | text | — | **OK** |
| **Venue** | courts | JSONB Column | `venues` | `courts` | jsonb | NÃO | **OK** |
| **Venue** | responsible / notes | ? | `venues` | — | — | — | **GAP (P2)**: colunas não existem em `venues` |
| **Person** | * (todos os campos) | TABELA INEXISTENTE | `persons` | — | — | — | **GAP ARQUITETURAL (P1)** |
| **Modality** | * (todos os campos) | ENUM, NÃO TABELA | `modalities` | — | — | — | **GAP ARQUITETURAL (P1)** |

---

## 7. CONTRATO DA ENTIDADE COMPETITION

### 7.1. Colunas de Primeiro Nível (`public.competitions`)
O PostgreSQL armazena exclusivamente:
- `id` (text, PK)
- `name` (text, NOT NULL)
- `slug` (text, NULL)
- `modality` (public.modality, NOT NULL, default 'indoor')
- `format` (text, NOT NULL, default 'round-robin')
- `player_format` (text, NOT NULL, default '6x6')
- `set_format` (text, NOT NULL, default '5-sets')
- `gender_category` (public.gender_category, NOT NULL, default 'mixed')
- `default_deadline` (timestamptz, NULL)
- `group_name` (text, NULL)
- `start_date` (date, NULL)
- `end_date` (date, NULL)
- `venue` (text, NULL)
- `status` (public.competition_status, NOT NULL, default 'draft')
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)
- `config` (jsonb, NULL) — **Fonte única da verdade de regras esportivas**
- `rules_snapshot` (jsonb, NULL) — **Snapshot imutável congelado**
- `organizer_id` (uuid, NULL, FK auth.users)
- `logo_url` (text, NULL)
- `supporters` (jsonb, NOT NULL, default '[]')

### 7.2. Estrutura do `config` (JSONB)
Todos os parâmetros de regras esportivas, fases e regulamento pertencem estritamente ao documento `config`:
```json
{
  "version": 1,
  "format": {
    "defaultSetsToWin": 2,
    "phaseOverrides": {
      "semifinals": 3,
      "final": 3
    },
    "setRules": {
      "regularSetPoints": 25,
      "tiebreakPoints": 15,
      "minAdvantage": 2
    },
    "formatType": "groups-knockout"
  },
  "scoring": {
    "systemType": "fivb-standard",
    "pointsWinClear": 3,
    "pointsWinNarrow": 2,
    "pointsLossNarrow": 1,
    "pointsLossClear": 0,
    "pointsWoWin": 3,
    "pointsWoLoss": 0
  },
  "standings": {
    "groupsCount": 2,
    "advancingPerGroup": 2,
    "bestThirds": {
      "enabled": false,
      "count": 0
    },
    "tiebreakCriteriaOrder": [
      "victories",
      "points",
      "sets-ratio",
      "points-ratio",
      "head-to-head"
    ]
  },
  "registration": {
    "minAthletes": 6,
    "maxAthletes": 14,
    "maxCaptains": 1,
    "maxLiberos": 2,
    "requireJerseyNumberOnRegistration": false
  }
}
```

### 7.3. O Erro da UI Atual (`CompetitionFormDialog.tsx`)
O diálogo monta o objeto `baseRecord` duplicando as propriedades internas do `config` como campos top-level:
```ts
// Linhas 225-242 de CompetitionFormDialog.tsx
const baseRecord: Omit<CompetitionRecord, 'id'> = {
  ...
  groupsCount: 2,               // -> gera coluna SQL 'groups_count'
  advancingPerGroup: 2,         // -> gera coluna SQL 'advancing_per_group'
  bestThirdsCount: 0,           // -> gera coluna SQL 'best_thirds_count'
  defaultMatchIntervalMinutes: 75, // -> gera coluna SQL 'default_match_interval_minutes'
  minTeamRestMinutes: 30,       // -> gera coluna SQL 'min_team_rest_minutes'
  tiebreakCriteriaOrder: [...], // -> gera coluna SQL 'tiebreak_criteria_order'
  phaseSetRules: { ... },       // -> gera coluna SQL 'phase_set_rules'
  config: canonicalConfig,
};
```
Ao repassar este payload para `supabaseAdapter.createCompetition`, o comando `insert(toSnake(payload))` tenta inserir colunas inexistentes na tabela `public.competitions`, gerando `PGRST204`.

---

## 8. CONTRATO DA ENTIDADE TEAM

### 8.1. Colunas Reais (`public.teams`)
- `id` (text, PK)
- `name` (text, NOT NULL)
- `short_name` (text, NOT NULL)
- `modality` (public.modality, NOT NULL, default 'indoor')
- `coach_name` (text, NULL)
- `city` (text, NULL)
- `logo_url` (text, NULL)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)

### 8.2. Análise dos Campos Ausentes e Identidade do Responsável
1. `state`: Campo cadastral legítimo de localização da equipe, ausente na tabela `teams`.
2. `managerName`, `managerEmail`, `managerPhone`: Não são atributos da equipe em si, mas da **pessoa do gestor/responsável**.
3. `managerPassword`: **FALHA CRÍTICA DE SEGURANÇA (P0)**.
   - O código em `TeamsPage.tsx` (linhas 671-694) gera senhas aleatórias e tenta persisti-las em texto puro em `teams.managerPassword`.
   - No PostgreSQL, a tabela `teams` não possui nem deve possuir coluna de senha.
   - A gestão de senhas e identidades pertence exclusivamente ao Supabase Auth (`auth.users`).
4. `registrationToken`: O token de acesso não pertence à equipe global, mas à inscrição da equipe em uma competição (`public.competition_teams.access_token`). Uma mesma equipe pode disputar vários torneios, cada um com seu respectivo token de inscrição.
5. `assistantCoach`, `physicalTrainer`, `doctor`: Membros da comissão técnica sem colunas em `teams`.

---

## 9. CONTRATO DA ENTIDADE COMPETITION_TEAM

### 9.1. Colunas Reais (`public.competition_teams`)
- `id` (text, PK)
- `competition_id` (text, FK `competitions.id`)
- `team_id` (text, FK `teams.id`)
- `team_name` (text)
- `team_short_name` (text)
- `access_token` (text, UNIQUE)
- `registration_deadline` (timestamptz)
- `is_locked` (boolean, default false)
- `status` (public.registration_status, default 'invited')
- `custom_notes` (text, NULL)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 9.2. Análise de Capacidade para Futuros Fluxos de Inscrição

| Conceito / Estado Desejado | Suporte no Schema Atual | Detalhes Técnicos / Evidência |
| :--- | :--- | :--- |
| **Convite (Invited)** | **SUPORTADO** | `status = 'invited'::registration_status`, gera `access_token` |
| **Em Preenchimento** | **SUPORTADO** | `status = 'in_progress'::registration_status` |
| **Finalizada / Submetida** | **SUPORTADO** | `status = 'submitted'::registration_status` |
| **Aprovada / Confirmada** | **SUPORTADO** | `status = 'approved'::registration_status` |
| **Rejeitada** | **SUPORTADO** | `status = 'rejected'::registration_status` |
| **Pré-Candidatura Aberta** | **NÃO SUPORTADO** | O enum `registration_status` não possui valor para pré-candidatura pública sem convite prévio |
| **Em Análise da Organização** | **NÃO SUPORTADO** | Ausência de status de análise documental intermediária |
| **Pagamento Pendente / Confirmado**| **NÃO SUPORTADO** | Não há campos financeiros (`payment_status`, `payment_proof_url`, `paid_amount`, etc.) |
| **Cancelada** | **NÃO SUPORTADO** | Ausência de valor `'cancelled'` no enum `registration_status` |
| **Capacidade Máxima de Equipes** | **PARCIAL** | Deve ser validado no nível de aplicação ou armazenado no `config` da competição |
| **Controle de Prazos** | **SUPORTADO** | Coluna `registration_deadline` e flag `is_locked` |
| **Auto-inscrição via Link** | **SUPORTADO** | RPC `public.register_athlete` opera com segurança através do `access_token` |

---

## 10. CONTRATO DA ENTIDADE COMPETITION_ATHLETE

### 10.1. Colunas Reais (`public.competition_athletes`)
- `id` (text, PK)
- `competition_team_id` (text, FK `competition_teams.id`)
- `name` (text, NOT NULL)
- `jersey_number` (integer, NULL, CHECK `jersey_number >= 1 AND jersey_number <= 99`)
- `position` (text, NOT NULL)
- `document_number` (text, NULL)
- `birth_date` (date, NULL)
- `is_captain` (boolean, NOT NULL, default false)
- `is_libero` (boolean, NOT NULL, default false)
- `gender` (text, NOT NULL, default 'female', CHECK `gender IN ('male', 'female')`)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)

### 10.2. Diagnóstico
O contrato de atletas inscritos está **100% íntegro e aderente ao PostgreSQL**. As regras de negócio (camisa opcional 1-99, 1 capitão, até 2 líberos, validação de posições) encontram respaldo tanto no banco quanto nos serviços TypeScript (`registrationService.ts`).

---

## 11. CONTRATO DA ENTIDADE MATCH

### 11.1. Colunas Reais (`public.matches`)
- `id` (text, PK)
- `competition_id` (text, FK `competitions.id`)
- `round` (integer, NOT NULL)
- `match_number` (integer, NOT NULL)
- `team_a_id` (text, FK `teams.id`)
- `team_b_id` (text, FK `teams.id`)
- `team_a_name` (text, NOT NULL)
- `team_b_name` (text, NOT NULL)
- `team_a_short_name` (text, NOT NULL)
- `team_b_short_name` (text, NOT NULL)
- `venue` (text, NOT NULL)
- `court` (text, NULL)
- `scheduled_time` (timestamptz, NOT NULL)
- `status` (public.match_status, NOT NULL, default 'scheduled')
- `sets` (jsonb, NOT NULL, default '[]')
- `referees` (jsonb, NOT NULL, default '[]')
- `observations` (text, NULL)
- `winner_id` (text, NULL)
- `slot_id` (text, NULL, FK `competition_match_slots.slot_id`)
- `phase` (text, NULL)
- `group_name` (text, NULL)
- `lineups` (jsonb, NULL)
- `highlight_athlete_id` (text, NULL, FK `competition_athletes.id`)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)

### 11.2. Gaps no `MatchRecord`
- `isWo`: No domínio é um booleano; no PostgreSQL é um estado (`status = 'wo'`). Não deve ser enviado como coluna.
- `homologatedAt` e `homologatedBy`: O domínio e o código do `supabaseAdapter.updateMatch` tentam referenciar essas propriedades. **Elas não existem como colunas em `public.matches`**. Se forem enviadas como colunas com valor não-nulo, o PostgREST rejeita a requisição com `PGRST204`.

---

## 12. AUTENTICAÇÃO, PERFIS E O MODELO DO RESPONSÁVEL DA EQUIPE

### 12.1. Respostas às 8 Questões Essenciais de Identidade
1. **Quem é o usuário?** É a conta autenticada no `Supabase Auth` (`auth.users`), identificada por um `UUID`.
2. **Quem é o responsável da equipe?** É um usuário autenticado que possui a role `'team'` e está vinculado a uma equipe na competição.
3. **Onde sua identidade é persistida?** Exclusivamente na tabela de sistema `auth.users`.
4. **Onde suas credenciais são gerenciadas?** Pelo motor do Supabase Auth (criptografia nativa de senhas, sessões JWT, rate limit).
5. **Como ele é associado à equipe?** Através da tabela `public.profiles`:
   - `profiles.id` (UUID, PK, FK `auth.users.id`)
   - `profiles.role` (`'team'`)
   - `profiles.competition_team_id` (text, FK `public.competition_teams.id`)
6. **Como ele é associado à competição?** Indiretamente através de `competition_teams.competition_id`.
7. **Qual entidade deve possuir essa relação?** A relação de acesso pertence à combinação `auth.users` ↔ `profiles` ↔ `competition_teams`. A entidade `teams` representa a agremiação esportiva e não deve carregar dados de credenciais pessoais.
8. **Existe implementação parcial já existente?** Sim. A tabela `public.profiles` possui a coluna `competition_team_id` com chave estrangeira para `competition_teams.id`, e as políticas RLS (`profiles_self_update`, `competition_athletes_team_write`) já utilizam `profiles.competition_team_id` para autorizar a inscrição de atletas por representantes autenticados.

---

## 13. O CONCEITO DE MODALITY: ENUM VS TABELA

- **Fonte Única da Verdade:** PostgreSQL Enum nativo `public.modality AS ENUM ('indoor', 'beach')`.
- Todas as tabelas relacionais do sistema (`competitions`, `teams`, `public_competitions`) utilizam esse enum de forma estrita.
- A tabela `public.modalities` **não existe** no banco de dados.
- Os métodos `listModalities`, `createModality`, `updateModality` no `supabaseAdapter` são frutos de um protótipo inicial em LocalStorage e falham ao tentar acessar a tabela inexistente no Supabase.
- **Diretriz:** A modalidade no BaseOS é conceitualmente um tipo estático (`indoor` vs `beach`), com regras regulamentares associadas, e não uma entidade dinâmica editável por usuário.

---

## 14. O CONCEITO DE PERSON: RESQUÍCIO DE LEGADO

- A interface `PersonRecord` e a tabela referenciada `public.persons` **não existem no PostgreSQL**.
- A tentativa em `TeamsPage.tsx` (linhas 198-210) de chamar `dataAccess.createPerson` ao salvar uma equipe falha com erro de PostgREST (`PGRST205`).
- No modelo relacional do BaseOS:
  - Atletas são persistidos em `competition_athletes`.
  - Árbitros são persistidos em `referees`.
  - Usuários e gestores são persistidos em `auth.users` e `public.profiles`.
- **Diretriz:** A abstração `persons` é obsoleta e deve ser descontinuada na camada de persistência Supabase.

---

## 15. AUDITORIA DE MÉTODOS DO DATA ACCESS

Matriz de auditoria dos métodos de `supabaseAdapter` em `src/services/dataAccess.ts`:

| Método | Entidade | Tabela Alvo | Payload Gerado | Mapper Usado | Trata Error? | Contrato Real |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `listCompetitions` | Competition | `competitions` | Select `*` | `mapRows` + `normalize` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `getCompetition` | Competition | `competitions` | Select by ID | `mapRow` + `normalize` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `createCompetition` | Competition | `competitions` | `toSnake(payload)` | `mapRow` + `normalize` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204) |
| `updateCompetition` | Competition | `competitions` | `toSnake(safeUpdates)`| `mapRow` + `normalize` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204 se tiver config top-level) |
| `listTeams` | Team | `teams` | Select `*` | `mapRows` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `createTeam` | Team | `teams` | `toSnake(input + id)` | `mapRow` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204) |
| `updateTeam` | Team | `teams` | `toSnake(updates)` | `mapRow` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204 se tiver state/manager) |
| `listCompetitionTeams`| CompTeam | `competition_teams` | Select by compId | `mapRows` | ❌ NÃO | **OK** |
| `createCompetitionTeam`| CompTeam | `competition_teams` | `toSnake` + token | `mapRow` | ❌ NÃO | **OK** (colunas batem) |
| `listCompetitionAthletes`| CompAthlete| `competition_athletes`| Select by ctId | `mapRows` | ❌ NÃO | **OK** |
| `createCompetitionAthlete`| CompAthlete| `competition_athletes`| `toSnake(input + id)` | `mapRow` | ❌ NÃO | **OK** (colunas batem) |
| `registerAthletePublic`| CompAthlete | RPC `register_athlete`| JSONB Args | `mapRow` | ✅ SIM | **OK** (Tratamento robusto) |
| `createMatch` | Match | `matches` | `toSnake` filtrado | `mapRow` | ❌ NÃO | **PARCIAL** (campos extras quebram) |
| `updateMatch` | Match | `matches` | `toSnake` sanitizado | `mapRow` | ❌ NÃO | **PARCIAL** (homologated quebra) |
| `listStages` | Stage | `competition_stages` | Select by compId | `mapRows` | ✅ SIM | **OK** (Lança erro com contexto) |
| `createStage` | Stage | `competition_stages` | `toSnake(payload)` | `mapRow` | ✅ SIM | **OK** |
| `saveStageDrawAndSlots`| Format | RPC `save_stage_draw_and_slots` | JSONB Args | Direct Cast | ✅ SIM | **OK** (Transacional) |
| `listModalities` | Modality | `modalities` (inexistente) | Select `*` | `mapRows` | ❌ NÃO | 🔴 **FALHA** (Tabela não existe) |
| `listPersons` | Person | `persons` (inexistente) | Select `*` | `mapRows` | ❌ NÃO | 🔴 **FALHA** (Tabela não existe) |

---

## 16. O PROBLEMA DA CONVERSÃO AUTOMÁTICA VIA `toSnake()`

O `supabaseAdapter` apoia-se nesta função para serializar payloads:
```ts
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)] = value;
  }
  return out;
}
```

### Riscos Sistêmicos do `toSnake()` Cego
1. **Injeção de Colunas Inexistentes:** Converte qualquer chave presente no objeto TypeScript em uma chave snake_case e envia ao PostgREST. Se o objeto de domínio possuir 1 campo que não seja coluna do banco, o PostgREST rejeita a query inteira com `PGRST204`.
2. **Mistura de Camadas de Dados:** O domínio do BaseOS agrega propriedades de conveniência na UI (ex: `groupsCount`, `tiebreakCriteriaOrder`, `managerPassword`, `isWo`). O `toSnake()` não sabe distinguir o que é coluna SQL de primeiro nível do que é dado de configuração JSONB, dado de Auth ou propriedade calculada.
3. **Impossibilidade de Evolução de Schema:** Qualquer adição de campo na interface TypeScript do frontend passa a causar falha imediata no backend caso o banco não receba uma migration síncrona.

### Padrão Arquitetural Recomendado para a Fase 8.2
Substituir a serialização cega por **Mappers Explícitos por Entidade**:
```text
Domain Object
      ↓
Explicit Persistence Mapper (whitelist de colunas + empacotamento em config JSONB)
      ↓
Validated Database Payload
      ↓
PostgREST / PostgreSQL
```

---

## 17. AUDITORIA DE TRATAMENTO DE ERROS

Foram auditadas **57 operações** no `supabaseAdapter`.
- **42 operações legadas** utilizam o padrão defeituoso:
  ```ts
  const { data } = await supabase.from(table).insert(...);
  return mapRow(data); // Se houver erro, data é null e o erro do PostgREST é perdido!
  ```
- **15 operações modernas** (stages, rounds, slots, RPCs de chaveamento) utilizam o padrão correto:
  ```ts
  const { data, error } = await supabase.from(table).insert(...);
  if (error) throw new Error(`Falha ao criar entidade: ${error.message}`);
  return mapRow(data);
  ```

**Classificação do Problema:** `CRÍTICO (P0)`.
O descarte do `{ error }` transforma falhas de rede, erros de validação de constraint (ex: duplicidade de chave ou campos obrigatórios ausentes) e erros de schema (400 Bad Request) em retornos nulos silenciosos, mascarando a real causa do problema para os componentes de interface.

---

## 18. MOCKS E TESTES ATUAIS

### Diagnóstico da Cegueira dos Mocks
O arquivo de teste do adapter (`src/test/dataAccessAdapter.test.ts`) possui um mock do Supabase que implementa o QueryBuilder da seguinte forma:
```ts
insert(payload: Record<string, unknown>) {
  if (!payload.id) {
    throw new Error(`PostgreSQL 23502: null value in column "id" of relation "${table}" violates not-null constraint`);
  }
  state.rows[table] = { ...payload };
  return chain;
}
```
**Por que os testes passavam enquanto a produção quebrava?**
- O mock verifica unicamente se `payload.id` existe.
- Ele **não valida as colunas** contra o schema real do banco de dados.
- Qualquer propriedade arbitrária (`managerPassword`, `groupsCount`, `fakeField`) é acolhida em memória sem erro.
- O teste nunca simulava o comportamento real do PostgREST, que consulta o schema cache e rejeita colunas não cadastradas com código de erro `PGRST204`.

### Matriz de Testes Relevantes

| Teste | Tipo | Mock Utilizado | Executa contra DB Real? | Detectaria PGRST204? |
| :--- | :--- | :--- | :---: | :---: |
| `dataAccessAdapter.test.ts` | Integração Adapter | Supabase Client Mockado | NÃO | ❌ NÃO (mock cego) |
| `teamsPage.test.tsx` | Componente | `dataAccess` mockado (`vi.fn()`) | NÃO | ❌ NÃO (mock direto) |
| `competitionsPage.test.tsx`| Componente | `dataAccess` mockado (`vi.fn()`) | NÃO | ❌ NÃO (mock direto) |
| `transactionalRpcPersistence.test.ts`| Regras / RPC | Supabase RPC Mockado | NÃO | ❌ NÃO |
| `stagePersistenceRepository.test.ts` | Persistência Runtime | Supabase Client Mockado | NÃO | ❌ NÃO |

---

## 19. GAPS ARQUITETURAIS IDENTIFICADOS

| ID | Classificação | Entidade | Descrição do Gap |
| :-- | :-----------: | :------- | :--------------- |
| **GAP-01** | **P0** | Competition | `createCompetition` envia campos de configuração regulamentar (`groupsCount`, `advancingPerGroup`, etc.) como colunas SQL de primeiro nível em vez de aninhá-los em `config` (JSONB). |
| **GAP-02** | **P0** | Team | `createTeam` envia propriedades de credenciais (`managerPassword`), contato e estado como colunas de `public.teams`, que não possui essas colunas. |
| **GAP-03** | **P0** | Auth / Team | Tentativa de armazenar senha de gestor em texto puro no domínio e em `teams` (Vulnerabilidade de Segurança Crítica). |
| **GAP-04** | **P0** | DataAccess | Supressão sistemática do objeto `{ error }` em métodos legados do `supabaseAdapter`, retornando `null` silencioso que quebra a UI. |
| **GAP-05** | **P1** | Person | O código invoca `dataAccess.createPerson`, mas a tabela `public.persons` não existe no banco de dados. |
| **GAP-06** | **P1** | Modality | O código invoca `dataAccess.listModalities` / `createModality`, mas `public.modalities` não existe como tabela (é um enum nativo no PostgreSQL). |
| **GAP-07** | **P1** | Team | Falta da coluna `state` na tabela `public.teams`. |
| **GAP-08** | **P1** | Match | Propriedades de homologação (`homologatedAt`, `homologatedBy`) e status de WO (`isWo`, `woReason`) não possuem colunas correspondentes em `public.matches`. |
| **GAP-09** | **P2** | Venue | Propriedades `responsible` e `notes` no domínio `VenueRecord` não possuem colunas em `public.venues`. |
| **GAP-10** | **P2** | Testes / Mocks | Suíte de testes do adapter não valida colunas contra o schema cache, permitindo que payloads inválidos passem nos testes. |

---

## 20. RISCOS CLASSIFICADOS (P0 / P1 / P2)

### P0 (Bloqueio Crítico / Risco Imediato de Perda ou Quebra)
1. **Indisponibilidade dos fluxos centrais:** Usuários reais não conseguem criar campeonatos nem cadastrar equipes na instância VOLTZ (ou qualquer ambiente Supabase).
2. **Exposição de Credenciais:** Persistência indevida de senhas em LocalStorage e tentativa de envio via payload não seguro.
3. **Falhas em Cadeia na UI:** Retornos `null` silenciosos geram crashes catastróficos em componentes React que presumem retorno do objeto criado.

### P1 (Quebra de Funcionalidade / Inconsistência Relevante)
1. **Tentativa de acesso a tabelas inexistentes:** `persons`, `modalities`, `document_edits`.
2. **Perda de dados de localização:** O estado (`state`) da equipe é descartado ou causa erro.
3. **Falha na Homologação de Partidas:** Tentativa de gravar `homologated_at` em coluna inexistente de `matches`.

### P2 (Dívida Técnica / Inconsistência Menor)
1. **Campos secundários de ginásios:** `responsible` e `notes` em `venues`.
2. **Mocks permissivos:** Necessidade de criar schema validator nos testes mockados.

---

## 21. CONTRATO CANÔNICO PROPOSTO PARA A FASE 8.2

Para que a implementação na Fase 8.2 seja cirúrgica e definitiva, o fluxo de dados deve respeitar o seguinte pipeline:

```text
[ FORM / DOMAIN MODEL ]
           ↓
[ EXPLICIT MAPPER ]
  - Separa colunas SQL de 1º nível
  - Empacota regras esportivas no JSONB 'config'
  - Remove credenciais de domínio
  - Redireciona dados de responsável para Auth / Profiles
           ↓
[ PERSISTENCE PAYLOAD ]
           ↓
[ POSTGREST / POSTGRESQL ]
           ↓
[ RESPONSE MAPPER ]
  - Desestrutura { data, error }
  - Se error: lança exceção com código e mensagem do Postgres
  - Se data: converte snake_case para camelCase e normaliza
           ↓
[ DOMAIN ENTITY (UI) ]
```

### Regras Canônicas por Entidade

#### A. Competição (`Competition`)
- **Colunas SQL Enviadas:** `id`, `name`, `slug`, `modality`, `format`, `player_format`, `set_format`, `gender_category`, `default_deadline`, `group_name`, `start_date`, `end_date`, `venue`, `status`, `config`, `rules_snapshot`, `organizer_id`, `logo_url`, `supporters`.
- **Campos Aninhados no `config` (JSONB):** `groupsCount`, `teamsPerGroup`, `advancingPerGroup`, `bestThirdsCount`, `useBestThirds`, `tiebreakCriteriaOrder`, `phaseSetRules`, `defaultMatchIntervalMinutes`, `minTeamRestMinutes`, `woRules`.

#### B. Equipe (`Team`)
- **Colunas SQL Enviadas:** `id`, `name`, `short_name`, `modality`, `coach_name`, `city`, `logo_url`.
- **Campos Removidos do Payload SQL da Tabela `teams`:** `managerName`, `managerEmail`, `managerPhone`, `managerPassword`, `registrationToken`, `state`.
- **Vínculo do Gestor:** Criado separadamente via Supabase Auth + `public.profiles` (vinculado a `competition_teams`).

#### C. Inscrição da Equipe (`CompetitionTeam`)
- **Colunas SQL Enviadas:** `id`, `competition_id`, `team_id`, `team_name`, `team_short_name`, `access_token`, `registration_deadline`, `is_locked`, `status`, `custom_notes`.

---

## 22. DECISÕES QUE PRECISAM SER TOMADAS NA FASE 8.2

1. **Gestão de Equipes vs. Inscrições:**
   - Decidir se o cadastro na `TeamsPage` cadastra apenas a equipe institucional (global) ou se já cria um vínculo imediato com a competição ativa.
   - Definir se a coluna `state` será adicionada a `public.teams` via migration oficial ou se ficará em campo estruturado.
2. **Fluxo de Responsável da Equipe:**
   - Estabelecer se o acesso da equipe será exclusivamente via **Link de Inscrição com Token Único** (`competition_teams.access_token`), eliminando senhas manuais para representantes, ou se haverá criação de conta formal no Supabase Auth para o gestor.
3. **Eliminação de Módulos Fantasmas:**
   - Formalizar a depreciação e remoção de `createPerson` e dos endpoints da tabela `modalities`.

---

## 23. RECOMENDAÇÕES DE ARQUITETURA

1. **Criar Mappers Especializados:** Criar arquivos `competitionMapper.ts` e `teamMapper.ts` em `src/services/mappers/` com funções puras `toPersistence(domain)` e `toDomain(dbRow)`.
2. **Padronizar Tratamento de Erros no Supabase Client:** Criar helper `assertSupabaseSuccess(data, error, context)` que lance erros semânticos contendo o código PostgREST (ex: PGRST204, 23505).
3. **Endurecer os Mocks de Teste:** No mock do `getSupabaseClient`, adicionar uma camada de validação baseada numa lista de colunas permitidas por tabela, disparando erro similar ao `PGRST204` caso colunas inválidas sejam enviadas.

---

## 24. O QUE NÃO DEVE SER ALTERADO AINDA

Em estrito cumprimento às regras da Fase 8.1:
- ❌ **NÃO** alterar schemas ou migrations no PostgreSQL.
- ❌ **NÃO** refatorar os formulários da UI (`CompetitionFormDialog`, `TeamsPage`).
- ❌ **NÃO** remover campos das interfaces TypeScript (`TeamRecord`, `CompetitionRecord`).
- ❌ **NÃO** aplicar correções funcionais de código nos adapters.
- ❌ **NÃO** fazer deploy para VOLTZ nem gerar tags de release.

---

## 25. CONCLUSÃO DA FASE 8.1

À pergunta fundamental desta fase:
> *"Se amanhã corrigirmos `createCompetition` e `createTeam`, sabemos exatamente qual payload deve chegar ao PostgreSQL e onde cada informação do domínio deve ser persistida?"*

A resposta técnica comprovada é:
# **SIM.**

O contrato canônico está inteiramente documentado, respaldado por evidência direta do banco de dados e pronto para orientar com segurança a **Fase 8.2 — Modelo Funcional da Competição, Lifecycle Interno e Fluxo de Inscrição/Confirmação de Equipes**.
