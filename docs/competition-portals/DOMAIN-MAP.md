# BASEOS — MAPEAMENTO INTEGRAL DE ENTIDADES DE DOMÍNIO
## Especificação Completa de Tipos, Tabelas, Relacionamentos, Ciclos de Vida e Lacunas

**Projeto:** BaseOS (VolleyPro)  
**Data:** 04/09/2026  
**Documento:** `docs/competition-portals/DOMAIN-MAP.md`  

---

## 1. MATRIZ GERAL DAS 13 ENTIDADES

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DOMÍNIO BASEOS                                        │
│                                                                                        │
│                                      User / Role                                       │
│                                           │                                            │
│                                           ▼                                            │
│                                  CompetitionConfig                                     │
│                                           │                                            │
│                                           ▼                                            │
│     Team ◄───────────────────── CompetitionRegistration ──────────► Competition        │
│      │                                    │                              │             │
│      ├─► TechnicalCommittee               │                              │             │
│      │                                    ▼                              ▼             │
│      └─► Athlete ◄────────────── CompetitionAthlete                    Draw            │
│                                                                          │             │
│                                                                          ▼             │
│                                                                        Group           │
│                                                                          │             │
│                                                                          ▼             │
│                                                                        Match           │
│                                                                          │             │
│                                                                          ▼             │
│                                                                      Standings         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DETALHAMENTO ENTIDADE POR ENTIDADE

### 2.1. Competition (Competição)
- **Tipo / Interface:** `CompetitionRecord` em [`src/types/entities.ts:52-102`](file:///home/diego-martins/docker/volei/src/types/entities.ts#L52-L102).
- **Tabela Supabase:** `public.competitions` (definida em `20260818000000_initial_schema.sql` e estendida em `20260903000001_competition_lifecycle_and_rules.sql`).
- **Relacionamentos:**
  - `1 : N` com `CompetitionTeam` (`competition_id`).
  - `1 : N` com `Match` (`competition_id`).
  - `1 : 1` com `Draw` (`competition_id`).
  - `N : 1` com `Modality` (`modality_id`).
- **Campos Principais:** `id`, `name`, `modality` (`indoor` | `beach`), `format`, `playerFormat`, `setFormat`, `genderCategory` (`male` | `female` | `mixed`), `status` (`CompetitionLifecycleStatus`), `config` (`CompetitionConfig`), `rulesSnapshot` (`CompetitionConfig`), `defaultDeadline`, `groupsCount`, `advancingPerGroup`, `bestThirdsCount`, `startDate`, `endDate`, `venue`.
- **Quem Cria:** `CompetitionsPage.tsx` através de `CompetitionFormDialog.tsx` via `dataAccess.createCompetition`.
- **Quem Altera:** `CompetitionsPage.tsx` (`handleUpdateStatus`, `handleUpdateConfig`), `CompetitionLifecycleService.ts`.
- **Quem Consulta:** Praticamente toda a aplicação (`MatchesPage`, `DrawPage`, `StandingsPage`, `TeamRosterRegistrationPage`, `ActiveCompetitionsPage`).
- **Status Existentes:** `'planning'` | `'registration-open'` | `'registration-closed'` | `'draw-pending'` | `'groups-defined'` | `'in-progress'` | `'playoffs'` | `'completed'` | `'cancelled'` (além dos legados `'draft'` e `'registration'`).
- **Problemas Encontrados:** O campo `defaultDeadline` nem sempre propaga automaticamente para as inscrições de equipes que são criadas após sua alteração.

---

### 2.2. CompetitionConfig (Contrato de Regras Esportivas)
- **Tipo / Interface:** `CompetitionConfig` em [`src/types/competitionConfig.ts:123-140`](file:///home/diego-martins/docker/volei/src/types/competitionConfig.ts#L123-L140).
- **Tabela Supabase:** Armazenada como JSONB na coluna `config` e congelada na coluna `rules_snapshot` em `public.competitions`.
- **Relacionamentos:** Pertence à `CompetitionRecord`.
- **Campos Principais:**
  - `version: 1`
  - `format`: `defaultSetsToWin` (1, 2, 3), `phaseOverrides`, `setRules` (`regularSetPoints`, `tiebreakPoints`, `minAdvantage`).
  - `scoring`: `systemType`, `pointsWinClear`, `pointsWinNarrow`, `pointsLossNarrow`, `pointsLossClear`, `pointsWoWin`, `pointsWoLoss`.
  - `standings`: `tiebreakCriteriaOrder`, `advancingPerGroup`, `bestThirds`.
  - `registration`: `minAthletes`, `maxAthletes`, `maxCaptains`, `maxLiberos`, `requireJerseyNumberOnRegistration`.
- **Quem Cria:** `CompetitionRulesService.normalizeLegacyToConfig` e presets padrão (`DEFAULT_INDOOR_COMPETITION_CONFIG`, `DEFAULT_BEACH_COMPETITION_CONFIG`).
- **Quem Altera:** Organizador em `CompetitionSettingsEditDialog.tsx` (enquanto `canEditRules` for verdadeiro).
- **Quem Consulta:** `CanonicalMatchResult`, `StandingsService`, `LiveScorerDeskModal`, `CompetitionRegistrationService`.
- **Status Existentes:** Não possui status próprio; seu congelamento é governado pelo preenchimento da coluna `rulesSnapshot`.
- **Problemas Encontrados:** Falta validação de schema JSON no Supabase (não há constraint `check` para os campos internos do JSONB).

---

### 2.3. Team (Agremiação / Equipe Global)
- **Tipo / Interface:** `TeamRecord` em [`src/types/entities.ts:104-125`](file:///home/diego-martins/docker/volei/src/types/entities.ts#L104-L125).
- **Tabela Supabase:** `public.teams` (`20260818000000_initial_schema.sql:41-49`).
- **Relacionamentos:**
  - `1 : N` com `CompetitionTeam` (`team_id`).
  - `1 : N` com `Match` (`team_a_id`, `team_b_id`).
  - `1 : N` com `Person` (`teamIds`).
- **Campos Principais:** `id`, `name`, `shortName`, `modality`, `city`, `state`, `managerName`, `managerEmail`, `managerPhone`, `managerPassword`, `registrationToken`, `coachName`, `assistantCoach`, `physicalTrainer`, `doctor`, `logoUrl`, `status` (`'registered' | 'invited' | 'confirmed' | 'blocked'`).
- **Quem Cria:** `TeamsPage.tsx` via `dataAccess.createTeam`.
- **Quem Altera:** `TeamsPage.tsx` via `dataAccess.updateTeam`.
- **Quem Consulta:** `TeamsPage`, `MatchesPage`, `DrawPage`, `StandingsPage`.
- **Status Existentes:** `'registered'`, `'invited'`, `'confirmed'`, `'blocked'`.
- **Problemas Encontrados:** É uma entidade desconectada da competição. Cria dados de gestor e senha na agremiação global, quando o acesso é para uma inscrição em um campeonato específico.

---

### 2.4. CompetitionRegistration (Inscrição na Competição / `CompetitionTeam`)
- **Tipo / Interface:** `CompetitionTeam` em [`src/types/registration.ts:35-48`](file:///home/diego-martins/docker/volei/src/types/registration.ts#L35-L48).
- **Tabela Supabase:** `public.competition_teams` (`20260818000000_initial_schema.sql:67-81`).
- **Relacionamentos:**
  - `N : 1` com `Competition` (`competition_id`).
  - `N : 1` com `Team` (`team_id`).
  - `1 : N` com `CompetitionAthlete` (`competition_team_id`).
  - `1 : 1` com `Profile` (`competition_team_id`).
  - `unique (competition_id, team_id)`.
- **Campos Principais:** `id` (`ct-xxx`), `competitionId`, `teamId`, `teamName`, `teamShortName`, `accessToken` (token de 32 chars), `registrationDeadline` (ISO), `isLocked` (boolean), `status` (`RegistrationStatus`), `customNotes`.
- **Quem Cria:** `CompetitionRegistrationsPage.tsx` (`handleInvite`) via `dataAccess.createCompetitionTeam`.
- **Quem Altera:** `CompetitionRegistrationsPage.tsx` (aprovação, rejeição, prorrogação de prazo), `TeamRosterRegistrationPage.tsx` (`markRosterSubmitted`).
- **Quem Consulta:** `CompetitionRegistrationsPage`, `TeamRosterRegistrationPage`, `DrawPage`.
- **Status Existentes:** `'invited'`, `'in_progress'`, `'submitted'`, `'approved'`, `'rejected'`.
- **Problemas Encontrados:** O sorteio aceita equipes com status `'invited'`, `'in_progress'` e `'submitted'` sem que tenham sido aprovadas ou tenham cumprido o elenco mínimo.

---

### 2.5. Athlete (Atleta)
- **Tipo / Interface:**
  - No elenco inscrito: `CompetitionAthlete` em [`src/types/registration.ts:50-64`](file:///home/diego-martins/docker/volei/src/types/registration.ts#L50-L64).
  - No cadastro geral de pessoas: `PersonRecord` em [`src/types/entities.ts:151-165`](file:///home/diego-martins/docker/volei/src/types/entities.ts#L151-L165).
- **Tabela Supabase:** `public.competition_athletes` e `public.persons`.
- **Relacionamentos:**
  - `CompetitionAthlete` vincula-se a `CompetitionTeam` (`competition_team_id`).
- **Campos Principais (`CompetitionAthlete`):** `id`, `competitionTeamId`, `name`, `jerseyNumber` (1-99, opcional), `position`, `documentNumber`, `birthDate`, `isCaptain`, `isLibero`, `gender`.
- **Quem Cria:** `TeamRosterRegistrationPage.tsx` via `registrationService.addAthlete` / `dataAccess.createCompetitionAthlete`.
- **Quem Altera:** `TeamRosterRegistrationPage.tsx` (`updateAthlete`).
- **Quem Consulta:** Súmulas (`MatchSheetPage`), `LiveScorerDeskModal`, `AthletesPage`, `ReportsPage`.
- **Status Existentes:** Não possui status próprio; participa ativamente do elenco da equipe.
- **Problemas Encontrados:** `PersonRecord` e `CompetitionAthlete` são duplicados e não se sincronizam automaticamente.

---

### 2.6. Technical Committee (Comissão Técnica)
- **Tipo / Interface:** Campos em `TeamRecord` (`coachName`, `assistantCoach`, `physicalTrainer`, `doctor`) e registros de `PersonRecord` com `roles: ['coach', 'manager']`.
- **Tabela Supabase:** Colunas em `public.teams` e linhas em `public.persons`.
- **Relacionamentos:** Vinculados à agremiação por `teamIds: string[]`.
- **Campos Principais:** Nome, cargo, documento, telefone, e-mail.
- **Quem Cria:** `TeamsPage.tsx` e `PeoplePage.tsx`.
- **Quem Altera:** `TeamsPage.tsx`.
- **Quem Consulta:** Súmula oficial de partida (`matchSheetPdf.ts`) e fichas de jogo.
- **Problemas Encontrados:** Não há entidade formal `CompetitionTechnicalMember` para controlar permissão ou assinatura de comissão técnica por competição específica.

---

### 2.7. User (Usuário do Sistema)
- **Tipo / Interface:** `SystemUser` e `UserProfile` em [`src/types/auth.ts:14-32`](file:///home/diego-martins/docker/volei/src/types/auth.ts#L14-L32).
- **Tabela Supabase:** `auth.users` e `public.profiles`.
- **Relacionamentos:** `profiles.id` aponta para `auth.users.id`. `profiles.competition_team_id` aponta para `competition_teams.id`.
- **Campos Principais:** `id`, `email`, `name`, `role` (`UserRole`), `status` (`'active' | 'inactive'`), `competitionTeamId`.
- **Quem Cria:** `SettingsPage.tsx` (`authService.createUser`) em modo LocalStorage; trigger `on_auth_user_created` em modo Supabase.
- **Quem Altera:** `SettingsPage.tsx` (`authService.updateUser`), próprio usuário (`changePassword`).
- **Quem Consulta:** `useAuth()`, `RequireAuth`, `SettingsPage`.
- **Status Existentes:** `'active'`, `'inactive'`.
- **Problemas Encontrados:** Falta sincronismo entre o cadastro de equipes e a criação do usuário do gestor.

---

### 2.8. Role (Papel de Acesso)
- **Tipo / Interface:** `UserRole` em [`src/types/auth.ts:3`](file:///home/diego-martins/docker/volei/src/types/auth.ts#L3).
- **Valores Existentes:** `'admin'`, `'organizer'`, `'referee'`, `'scorer'`, `'team'`, `'viewer'`.
- **Tabela Supabase:** Enum `public.user_role` (`'organizer'`, `'referee'`, `'team'`).
- **Problemas Encontrados:** Divergência entre a aplicação e o banco: o banco não possui `'admin'`, `'scorer'` e `'viewer'` no enum original `public.user_role`.

---

### 2.9. Match (Partida / Confronto)
- **Tipo / Interface:** `MatchRecord` em [`src/types/entities.ts:222-255`](file:///home/diego-martins/docker/volei/src/types/entities.ts#L222-L255).
- **Tabela Supabase:** `public.matches` (`20260818000000_initial_schema.sql:143-165`).
- **Relacionamentos:**
  - `N : 1` com `Competition` (`competition_id`).
  - `N : 1` com `Team` (`team_a_id`, `team_b_id`).
  - `1 : N` com `MatchAuditEntry` (`auditLog`).
- **Campos Principais:** `id`, `competitionId`, `round`, `matchNumber`, `teamAId`, `teamBId`, `teamAName`, `teamBName`, `venue`, `court`, `phase`, `groupName`, `scheduledTime`, `status` (`MatchLifecycleStatus`), `sets` (JSONB `SetScoreRecord[]`), `referees` (JSONB), `winnerId`, `isWo`, `homologatedAt`, `homologatedBy`.
- **Quem Cria:** `DrawPage.tsx` (`dataAccess.saveDrawWithMatches`), `CreateMatchPage.tsx`, `playoffsService.ts`.
- **Quem Altera:** `LiveScorerDeskModal.tsx`, `MatchesPage.tsx`.
- **Quem Consulta:** `MatchesPage`, `MatchSheetPage`, `StandingsPage`, `TeamRosterRegistrationPage`.
- **Status Existentes:** `'awaiting_schedule'`, `'scheduled'`, `'warmup'`, `'in-progress'`, `'timeout'`, `'set-break'`, `'completed'`, `'awaiting_homologation'`, `'homologated'`, `'cancelled'`, `'postponed'`, `'rescheduled'`, `'wo'`.
- **Problemas Encontrados:** O enum `public.match_status` no PostgreSQL não possui todos os status avançados do frontend.

---

### 2.10. Draw (Sorteio)
- **Tipo / Interface:** `DrawRecord` e `DrawResult` em [`src/types/draw.ts`](file:///home/diego-martins/docker/volei/src/types/draw.ts).
- **Tabela Supabase:** `public.draws` (`20260819000001_draws.sql` e `20260829000001_draws_status.sql`).
- **Relacionamentos:** `1 : 1` com `Competition` (`unique (competition_id)`).
- **Campos Principais:** `id`, `competitionId`, `config` (JSONB `DrawConfig`), `groups` (JSONB `DrawGroup[]`), `matches` (JSONB `DrawMatchProposal[]`), `status` (`'preview' | 'official' | 'locked'`).
- **Quem Cria:** `DrawPage.tsx` via `dataAccess.saveDrawWithMatches`.
- **Quem Altera:** `DrawPage.tsx` via `dataAccess.updateDrawStatus`.
- **Quem Consulta:** `DrawPage.tsx`.
- **Status Existentes:** `'preview'`, `'official'`, `'locked'`.
- **Problemas Encontrados:** O sorteio não altera o status da competição pai para `'groups-defined'`.

---

### 2.11. Group (Grupo / Chave)
- **Tipo / Interface:** `DrawGroup` em [`src/types/draw.ts:28-31`](file:///home/diego-martins/docker/volei/src/types/draw.ts#L28-L31).
- **Estrutura:** Subentidade embutida dentro de `DrawRecord.groups`: `{ name: string; teams: DrawTeamEntry[] }`.
- **Relacionamentos:** Cada grupo contém referências a equipes (`teamId`, `seed`).
- **Campos Principais:** `name` (ex.: `'Grupo A'`, `'Grupo B'`), `teams`.
- **Quem Cria:** `drawService.distributeTeamsIntoGroups`.
- **Quem Consulta:** `DrawPage`, `StandingsPage`, `CompetitionsPage`.

---

### 2.12. Standings (Classificação e Desempate)
- **Tipo / Interface:** `GroupStandingsRecord` e `TeamStandingRow` em [`src/services/standingsService.ts`](file:///home/diego-martins/docker/volei/src/services/standingsService.ts).
- **Tabela Supabase:** Não persistida em tabela própria; **totalmente derivada e computada em tempo real** a partir das partidas homologadas/concluídas (`CanonicalMatchResult`).
- **Campos Principais:** `teamId`, `teamName`, `matchesPlayed`, `victories`, `losses`, `points`, `setsWon`, `setsLost`, `setsRatio`, `pointsScored`, `pointsConceded`, `pointsRatio`.
- **Quem Consulta:** `StandingsPage`, `CompetitionsPage`, `TeamRosterRegistrationPage`, relatórios em PDF (`reportsPdf.ts`).

---

### 2.13. Competition Phases (Fases da Competição)
- **Representação:**
  - Macro: `CompetitionLifecycleStatus` (`planning`, `registration-open`, `registration-closed`, `draw-pending`, `groups-defined`, `in-progress`, `playoffs`, `completed`, `cancelled`).
  - Micro (Partidas): campo `phase` em `MatchRecord` (`'classificatória'`, `'oitavas'`, `'quartas'`, `'semifinal'`, `'terceiro_lugar'`, `'final'`).
  - Regras de Sets por Fase: `PhaseFormatOverrides` em `competition.config.format.phaseOverrides`.
