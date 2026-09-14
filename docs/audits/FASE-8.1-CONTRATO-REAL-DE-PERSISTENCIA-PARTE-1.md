# BASEOS — RELATÓRIO TÉCNICO DE AUDITORIA — FASE 8.1
# PARTE 1: DIAGNÓSTICO, SCHEMA POSTGRESQL REAL E CONTRATOS DE ENTIDADES
*(Seções 1 a 11 do Contrato Canônico de Persistência)*

> **Documento complementar:** Consulte a [Parte 2 (Seções 12 a 25)](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md) para Autenticação, DataAccess, Gaps Arquiteturais, Riscos P0/P1/P2 e Contrato Canônico Proposto.

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
