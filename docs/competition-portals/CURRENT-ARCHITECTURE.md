# BASEOS — ARQUITETURA TÉCNICA ATUAL
## Análise de Componentes, Estado, Camada de Dados e CompetitionConfig

**Projeto:** BaseOS (VolleyPro)  
**Data:** 04/09/2026  
**Documento:** `docs/competition-portals/CURRENT-ARCHITECTURE.md`  

---

## 1. VISÃO GERAL DA ARQUITETURA

O BaseOS é um sistema web Single Page Application (SPA) construído sobre a seguinte pilha técnica:
- **Core:** React 18 + TypeScript + Vite 5
- **Roteamento:** React Router DOM v6 com lazy loading em todas as views
- **Gerenciamento de Estado de Servidor:** TanStack React Query v5
- **Estilização:** Tailwind CSS + Radix UI Primitives + Lucide Icons
- **Document Engine:** `@react-pdf/renderer` para renderização vetorial oficial de súmulas desportivas e boletins
- **Visualização 3D:** Three.js + `@react-three/fiber` para sorteio cinematográfico de chaves
- **Persistência Híbrida:** Padrão Adapter em `dataAccess.ts` suportando LocalStorage e Supabase (PostgreSQL 15)

---

## 2. A FONTE ÚNICA DA VERDADE: `CompetitionConfig`

### 2.1. O Contrato Canônico
O contrato canônico de regras esportivas reside em [`src/types/competitionConfig.ts`](file:///home/diego-martins/docker/volei/src/types/competitionConfig.ts) e possui versão explícita (`version: 1`):

```ts
export interface CompetitionConfig {
  version: number;
  format: {
    defaultSetsToWin: SetsToWin; // 1 (único), 2 (melhor de 3), 3 (melhor de 5)
    phaseOverrides?: PhaseFormatOverrides; // groupStage, roundOf16, quarterfinals, semifinals, final
    setRules: {
      regularSetPoints: number; // ex: 25 na quadra, 21 na praia
      tiebreakPoints: number;   // ex: 15 pontos
      minAdvantage: number;     // ex: 2 pontos
    };
  };
  scoring: ScoringSystemConfig; // pointsWinClear (3), pointsWinNarrow (2), pointsLossNarrow (1), pointsLossClear (0), pointsWoWin (3), pointsWoLoss (0)
  standings: StandingsConfig;   // tiebreakCriteriaOrder, advancingPerGroup, bestThirds
  registration: RegistrationRulesConfig; // minAthletes, maxAthletes, maxCaptains, maxLiberos, requireJerseyNumberOnRegistration
}
```

### 2.2. Fluxo da Configuração no Sistema

```text
[CompetitionFormDialog] ─── Normalização via CompetitionRulesService ───┐
                                                                        ▼
                                                          dataAccess.createCompetition
                                                                        │
                                                ┌───────────────────────┴───────────────────────┐
                                                ▼                                               ▼
                                      LocalStorage ('competitions')                     Supabase ('competitions')
                                      JSON estruturado                                  Colunas config / rules_snapshot
                                                │                                               │
                                                └───────────────────────┬───────────────────────┘
                                                                        ▼
                                                          dataAccess.getCompetition(id)
                                                                        │
                                                                        ▼
                                                          CompetitionRulesService (Normalizador)
                                                                        │
                              ┌─────────────────────────────────────────┼────────────────────────────────────────┐
                              ▼                                         ▼                                        ▼
                   CanonicalMatchResult                       standingsService                         RegistrationRules
            (Cálculo matemático de sets/pontos)      (Critérios FIVB/CBV de desempate)           (Limites de elenco e líberos)
```

### 2.3. Páginas e Módulos que Consomem `CompetitionConfig`
1. [`src/pages/CompetitionsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/CompetitionsPage.tsx): visualização, edição de parâmetros, congelamento de snapshot no ciclo de vida.
2. [`src/pages/MatchesPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/MatchesPage.tsx): resolução do formato de sets de cada partida através de `CompetitionRulesService.resolveSetFormat(competition, match)`.
3. [`src/components/match/LiveScorerDeskModal.tsx`](file:///home/diego-martins/docker/volei/src/components/match/LiveScorerDeskModal.tsx): mesa de pontuação digital em tempo real, obtendo pontos de set regular e tiebreak direto de `competition.config`.
4. [`src/pages/StandingsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/StandingsPage.tsx): cálculo de pontuação na tabela e ordenação por critérios de desempate CBV/FIVB.
5. [`src/pages/TeamRosterRegistrationPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx): limites de elenco (mínimo, máximo, capitão, líberos).
6. [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts): controle de transição e congelamento imutável de `rulesSnapshot`.
7. [`src/services/competitionRegistrationService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionRegistrationService.ts): integridade de elencos.

### 2.4. Diagnóstico de Pontos com Regras Próprias, Legadas ou Hardcoded
1. **Limites de Elenco em `ROSTER_LIMITS` (`src/types/registration.ts:25-30`):**
   - Existe uma constante estática `ROSTER_LIMITS: Record<string, { min: number; max: number }>` com valores fixos (`'6x6': { min: 6, max: 14 }`).
   - Embora `CompetitionRulesService.getRosterLimits` use prioritariamente `competition.config.registration`, algumas chamadas que não passam `competition` recaem para esta constante legada (ex.: `validateAthleteInput` sem `competition`).
2. **Procedure Supabase `register_athlete` (`20260818000000_initial_schema.sql:258`):**
   - Contém verificação hardcoded: `if (select count(*) from public.competition_athletes where competition_team_id = v_team.id) >= 14 then return error;`.
   - Se uma competição for configurada para praia (`maxAthletes: 4`) ou quadra estendida (`maxAthletes: 18`), a procedure do banco mantém o teto de 14 forçado.
3. **Strings Legadas de Formato de Sets:**
   - Campos como `competition.setFormat: '3-sets' | '5-sets'` e `match.customSetFormat: '3-sets' | '5-sets'` ainda coexistem no banco e nas entidades com o canônico `SetsToWin: 2 | 3`. A função `parseLegacySetFormat` faz o bridge contínuo.

---

## 3. CAMADA DE ACESSO A DADOS: `dataAccess.ts`

Toda a aplicação interage com o banco de dados exclusivamente por meio de [`src/services/dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts). O módulo opera com um objeto singleton exportado (`dataAccess`) que seleciona o adaptador em runtime:

```ts
const adapter = isSupabaseConfigured() ? supabaseAdapter : localStorageAdapter;
export const dataAccess = adapter;
```

### 3.1. LocalStorage Adapter
- Utiliza o prefixo `voleipro.*` e chaves de coleção: `competitions`, `teams`, `referees`, `matches`, `competition_teams`, `competition_athletes`, `venues`, `draws`, `modalities`, `persons`, `audit_logs`.
- Carregamento inicial via `ensureSeeded()`: injeta automaticamente dados de demonstração de `src/data/seed.ts` caso o storage esteja vazio.
- Validação relacional em memória: implementa bloqueios contra deleções de equipes com partidas ou inscrições ativas.

### 3.2. Supabase Adapter
- Utiliza `@supabase/supabase-js` com variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Helpers `toSnake()` e `toCamel()` realizam conversão automática e bidirecional de chaves:
  - `competitionId` ↔ `competition_id`
  - `teamShortName` ↔ `team_short_name`
  - `rulesSnapshot` ↔ `rules_snapshot`
  - `registrationDeadline` ↔ `registration_deadline`
- Consultas relacionais mapeadas com tipos genéricos `mapRow<T>()` e `mapRows<T>()`.

---

## 4. SERVIÇOS DE DOMÍNIO

| Serviço | Arquivo | Responsabilidade |
|---|---|---|
| `CompetitionRulesService` | `src/services/competitionRulesService.ts` | Motor puro de regras: cálculo de sets, vantagens, pontuações de tabela, desempate, resolução de formato e criação de snapshot imutável. |
| `CompetitionLifecycleService` | `src/services/competitionLifecycleService.ts` | Guardião das fases do torneio: transições permitidas, bloqueio de reversão e congelamento de regras. |
| `CompetitionRegistrationService` | `src/services/competitionRegistrationService.ts` | Integridade de equipes e atletas: duplicidade de inscrição, camisa única, capitães, líberos e trava de remoção com histórico de jogos. |
| `CompetitionBracketService` | `src/services/competitionBracketService.ts` | Gerenciamento da árvore de playoffs, geração de confrontos eliminatórios a partir da classificação dos grupos e bloqueio de alteração com jogos em andamento. |
| `OperationalAuditService` | `src/services/operationalAuditService.ts` | Emissão central de logs operacionais respondendo às 7 perguntas canônicas com persistência em `dataAccess.addAuditLog`. |
| `StandingsService` | `src/services/standingsService.ts` | Classificação oficial dos grupos aplicando pontuação FIVB/CBV, confronto direto, set average, pontos average, saldo e sorteio. |
| `DrawService` | `src/services/drawService.ts` | PRNG determinístico mulberry32, distribuição equilibrada nos grupos e geração de partidas pelo método Berger. |
| `DrawValidator` | `src/services/drawValidator.ts` | Validação estrutural de configuração de sorteio, quantidade de grupos e cabeças de chave. |
| `TenantSecurityService` | `src/services/tenantSecurityService.ts` | Controle de capacidades RBAC, proteção contra IDOR/BOLA e isolamento de recursos por perfil. |
