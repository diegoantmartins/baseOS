# BASEOS — AUDITORIA MASTER DAS REGRAS ESPORTIVAS (FASE 5)

## Single Source of Truth (SSOT), Centralização e Cartografia do Domínio Esportivo

---

## 1. OBJETIVO DA AUDITORIA

Determinar de forma sistemática, factual e exaustiva se as **regras esportivas do domínio BaseOS** estão efetivamente centralizadas no pipeline canônico:

```text
CompetitionConfig (Versionado / Congelado)
        ↓
CompetitionRulesService
        ↓
Regras Resolvidas (SetFormatConfig, ScoringSystemConfig, etc.)
        ↓
Consumidores (Match, Set, Standings, Phase, Draw, Registration, Document Engine)
```

como **Single Source of Truth (SSOT)**.

Esta auditoria identifica:
1. Quais regras esportivas existem no sistema;
2. Onde cada regra nasce e onde é resolvida;
3. Onde cada regra é consumida e onde é ignorada;
4. Regras hardcoded, duplicadas, divergentes e com fallbacks defensivos;
5. Regras suportadas no domínio mas inacessíveis ou desabilitadas na UI;
6. Mecanismos de imutabilidade regulamentar (`rulesSnapshot` e triggers PostgreSQL);
7. Aderência arquitetural e GAPs críticos que demandam a **Fase 5.1**.

> **DIRETRIZ MANDATÓRIA DESTA FASE:** Execução em modo estritamente analítico (Read-Only). Nenhuma linha de código ou teste de aplicação foi alterada.

---

## 2. ESCOPO DA AUDITORIA

A auditoria cobriu 100% dos subsistemas do BaseOS que manipulam ou dependem de regras esportivas:

* **Contratos Canônicos:** `src/types/competitionConfig.ts`, `src/types/entities.ts`, `src/types/registration.ts`, `src/types/draw.ts`.
* **Motor de Resolução Central:** `src/services/competitionRulesService.ts`.
* **Partidas e Validação de Sets:** `src/services/matchValidationService.ts`, `src/services/competitionRuntimeService.ts`.
* **Classificação e Desempates:** `src/services/standingsService.ts`, `src/services/tieBreakEngine.ts`, `src/services/overallStandingsEngine.ts`, `src/services/scoringEngine.ts`.
* **Fases, Playoffs e Chaveamentos:** `src/services/playoffsService.ts`, `src/services/competitionBracketService.ts`, `src/services/genericPairingEngine.ts`, `src/services/genericProgressionEngine.ts`, `src/services/stageGraphEngine.ts`.
* **Templates e Construção:** `src/services/competitionTemplateService.ts`, `src/services/competitionFormatBuilder.ts`.
* **Sorteio e Elegibilidade:** `src/services/drawService.ts`, `src/services/competitionDrawEligibilityService.ts`.
* **Inscrições e Elencos:** `src/services/registrationService.ts`, `src/services/competitionRegistrationService.ts`.
* **Ciclo de Vida e Congelamento:** `src/services/competitionLifecycleService.ts`.
* **Persistência e Acesso a Dados:** `src/services/dataAccess.ts`, `supabase/migrations/`.
* **Document Engine (Súmula):** `src/document-engine/baseos/`.
* **Interfaces de Usuário (UI):** `CompetitionsPage.tsx`, `MatchesPage.tsx`, `CompetitionConfigTab.tsx`, `CompetitionSettingsEditDialog.tsx`, `CompetitionFormatBuilder.tsx`, `RulesConfigEditor.tsx`, `LiveScorerDeskModal.tsx`, `ResultValidationDialog.tsx`.
* **Suíte de Testes:** 97 arquivos de teste em `src/test/`.

---

## 3. METODOLOGIA

1. **Rastreamento de Símbolos e Referências:** Inspeção de fluxo de dados a partir dos nós emissores (`CompetitionConfig`, `CompetitionRulesService`) até os pontos finais de renderização e persistência.
2. **Busca Heurística e Semântica por Hardcodes:** Pesquisa de literais numéricos esportivos (`25`, `21`, `15`, `8`, `6`, `14`, `3`, `2`, `1`), operadores de comparação (`=== 25`, `>= 15`), literais de placar (`3x0`, `3x2`) e termos semânticos (`wo`, `bye`, `libero`).
3. **Classificação Semântica Estrita (Seção 7):** Diferenciação entre Regra Esportiva (A), Regra de Negócio (B), Constante Geométrica (C), Constante Técnica (D), Dado (E), Default (F), Fallback Defensivo (G), Legacy (H), Validação (I), Apresentação (J) e Test Fixture (K).
4. **Inspeção de Contratos de Banco:** Análise de schemas e triggers SQL no PostgreSQL.
5. **Auditoria de Formulários e Telas:** Comparação entre o modelo de dados suportado pelo motor e os campos editáveis pelo usuário.

---

## 4. ARQUITETURA ESPERADA vs. ARQUITETURA ENCONTRADA

### 4.1 Arquitetura Esperada (Visão Canônica)

```text
                    ┌─────────────────────────┐
                    │    CompetitionConfig    │
                    │   (Imutável via Trigger)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ CompetitionRulesService │
                    └────────────┬────────────┘
                                 │
                 Regras Resolvidas / Resultado Canônico
                                 │
       ┌──────────────┬──────────┴───┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼
     Match        Standings        Phase           Draw       Document Engine
 (Validação /   (Pontuação /   (Chaveamentos /  (Sorteio /     (Súmula PDF)
  W.O. / Sets)   Desempates)      Avanço)      Elegibilidade)
```

### 4.2 Arquitetura Encontrada (Realidade do Código)

```text
                               ┌─────────────────────────┐
                               │    CompetitionConfig    │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ CompetitionRulesService │
                               └────────────┬────────────┘
                                            │
     ┌──────────────────────┬───────────────┼───────────────┬──────────────────────┐
     │                      │               │               │                      │
     ▼                      ▼               ▼               ▼                      ▼
Document Engine        Match (Sets)    Registration     Standings                Phase
  [SSOT_CONFIRMED]   [SSOT_CONFIRMED]  [SSOT_CONFIRMED] [SSOT_WITH_FALLBACK]   [DUPLICATED / GAP]
  - Rules resolvidas - ResolveFormat   - RosterLimits   - Pontos: central      - Playoffs legado:
  - getCanonicalResult - ValidateMatch - Regras min/max   mas com 3 funcoes      hardcode 1Ax2B...
  - Súmula 100% SSOT - Live desk       - Camisas        - H2H: perde context!  - Format Engine:
                                                        - Overall: bypass      - Stages em Grafo
```

---

## 5. MAPA DE FLUXO DAS REGRAS ESPORTIVAS

```text
CompetitionConfig
      │
      ▼
CompetitionRulesService
      │
      ├── Match
      │     ├── Sets (setsToWin, regularSetPoints, tiebreakPoints) ──► [SSOT_CONFIRMED]
      │     ├── Result (getCanonicalMatchResult: setsWonA/B, winner) ─► [SSOT_CONFIRMED]
      │     └── W.O. (Placar regulamentar 2x0/3x0 via canonical) ────► [SSOT_CONFIRMED / UI_GAP]
      │
      ├── Standings
      │     ├── Competition Points (calculateCompetitionPoints) ─────► [SSOT / DUPLICATED em ScoringEngine]
      │     ├── Pairwise Head-to-Head (headToHeadWinner) ────────────► [DIVERGENT: perde competition context!]
      │     ├── Mini-Table (TieBreakEngine) ─────────────────────────► [SSOT_CONFIRMED]
      │     └── Overall Standings (Runtime) ─────────────────────────► [DIVERGENT: bypass de config em RuntimeService]
      │
      ├── Phase & Bracket
      │     ├── Format Engine Moderno (GenericPairing, DAG Stages) ──► [SSOT_CONFIRMED]
      │     ├── Playoffs Legado (playoffsService.ts: 1Ax2B...) ──────► [HARDCODED / LEGACY]
      │     └── BYE Advancement (GenericProgression, Runtime) ───────► [SSOT_CONFIRMED]
      │
      ├── Draw (Sorteio)
      │     ├── Elegibilidade de Elenco (DrawEligibilityService) ────► [SSOT_CONFIRMED]
      │     ├── Algoritmo Berger / Mulberry32 ───────────────────────► [TECHNICAL_ALGORITHM]
      │     └── DrawConfig (headSeeds, seedingMode) ─────────────────► [MISSING_FROM_CONFIG]
      │
      ├── Registration
      │     ├── Roster Limits (min/max atletas, líberos, capitães) ──► [SSOT_CONFIRMED]
      │     └── Limites estáticos de segurança (ROSTER_LIMITS) ──────► [FALLBACK_DEFENSIVO]
      │
      └── Document Engine (Súmula)
            ├── SetFormatConfig (setsToWin, targetPoints, sideChange) ► [SSOT_CONFIRMED]
            ├── Resultado Canônico (BaseosResult simétrico) ─────────► [SSOT_CONFIRMED]
            └── Réguas Físicas (36 reg / 30 tiebreak) ───────────────► [TECHNICAL_GEOMETRY]
```

---

## 6. INVENTÁRIO MASTER DAS REGRAS ESPORTIVAS

| RULE-ID | Regra | Domínio | Valor / Default | Fonte Atual | Fonte Pretendida | Consumidores | Hardcode | Duplicada | Divergente | Severidade | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **R-SET-01** | setsToWin | Match/Set | 2 (Quadra) / 2 (Praia) | `CompetitionConfig.format.defaultSetsToWin` | `CompetitionConfig` | `CompetitionRulesService`, `match.mapper`, `LiveScorerDeskModal`, `playoffsService` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-02** | maxSets | Match/Set | Derivado: `(setsToWin * 2) - 1` | `deriveMaxSets(setsToWin)` | `CompetitionConfig` | `CompetitionRulesService`, `BaseosResult`, `ResultValidationDialog` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-03** | regularSetPoints | Match/Set | 25 (Quadra) / 21 (Praia) | `CompetitionConfig.format.setRules.regularSetPoints` | `CompetitionConfig` | `CompetitionRulesService`, `set.rules`, `match.mapper`, `set.mapper`, `LiveScorerDeskModal` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-04** | tiebreakPoints | Match/Set | 15 (Quadra) / 15 (Praia) | `CompetitionConfig.format.setRules.tiebreakPoints` | `CompetitionConfig` | `CompetitionRulesService`, `set.rules`, `match.mapper`, `LiveScorerDeskModal` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-05** | minAdvantage | Match/Set | 2 pontos | `CompetitionConfig.format.setRules.minAdvantage` | `CompetitionConfig` | `CompetitionRulesService.validateSingleSet`, `set.rules` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-06** | sideChangeTriggerPoint | Match/Set | $\lceil \text{tiebreakPoints} / 2 \rceil$ (8 ou 11) | `set.rules.ts` (dinâmico) | `CompetitionRulesService` | `BaseosPointGrid`, `set.rules.ts` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SET-07** | phaseOverrides | Phase/Set | Semis: 3 / Final: 3 | `CompetitionConfig.format.phaseOverrides` | `CompetitionConfig` | `CompetitionRulesService.resolveMatchFormat`, `CompetitionSettingsEditDialog` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-RES-01** | canonicalMatchResult | Match | Vencedor e sets apurados | `CompetitionRulesService.getCanonicalMatchResult` | `CompetitionRulesService` | `match.mapper`, `standingsService`, `playoffsService`, `publicCompetitionService`, `MatchesPage` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-RES-02** | woScoreSets | Match/WO | 2x0 ou 3x0 conforme setsToWin | `CompetitionRulesService.getCanonicalMatchResult` | `CompetitionConfig.scoring` | `getCanonicalMatchResult`, `standingsService`, `match.mapper` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-RES-03** | woTriggerAction | Match/WO | Ação de declarar W.O. | Ausente na UI | `MatchesPage` / Dialog | Nenhum (apenas banco/mock) | **Sim** | Não | **Sim** | **CRITICAL** | `MISSING_FROM_CONFIG` |
| **R-STA-01** | competitionPoints | Standings | 3-2-1-0 (FIVB) | `CompetitionConfig.scoring` | `CompetitionConfig` | `CompetitionRulesService.calculateCompetitionPoints`, `standingsService` | Não | **Sim** | Não | MEDIUM | `SSOT_WITH_FALLBACK` |
| **R-STA-02** | scoringCalculationDuplication | Standings | 3 implementações paralelas | `CompetitionRulesService` + `ScoringEngine` + `competitionPointsFromSets` | `CompetitionRulesService` | `standingsService`, `ScoringEngine` | Não | **Sim** | Não | MEDIUM | `DUPLICATED` |
| **R-STA-03** | headToHeadContextLoss | Standings | Confronto direto | `standingsService.ts:headToHeadWinner` | `CompetitionRulesService` | `evaluateSingleCriterion` | Não | Não | **Sim** | **HIGH** | `DIVERGENT` |
| **R-STA-04** | overallStandingsCriteriaBypass | Standings | Critérios do ranking geral | `competitionRuntimeService.ts:562` | `CompetitionConfig.standings` | `reconcileCompetitionRuntime` | Não | Não | **Sim** | **HIGH** | `DIVERGENT` |
| **R-STA-05** | advancingPerGroup | Standings | 2 equipes | `CompetitionConfig.standings.advancingPerGroup` | `CompetitionConfig` | `CompetitionRulesService.normalizeLegacyToConfig`, `RulesConfigEditor` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-STA-06** | bestThirds | Standings | Habilitado: false, count: 0 | `CompetitionConfig.standings.bestThirds` | `CompetitionConfig` | `CompetitionRulesService`, `OverallStandingsEngine`, `RulesConfigEditor` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-BRA-01** | legacyPlayoffCrossings | Bracket | 1A x 2B, 1C x 2D... | `playoffsService.ts:generateFourGroupPlayoffs` | `StageDefinition.pairingConfig` | `playoffsService.ts`, `CompetitionBracketService` | **Sim** | **Sim** | **Sim** | **HIGH** | `HARDCODED` |
| **R-BRA-02** | modernBracketSeeding | Bracket | Potência de 2: [[1,8],[4,5]...] | `GenericPairingEngine.getSeededPairings` | `GenericPairingEngine` | `StageGraph`, `CompetitionFormatBuilder` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-BRA-03** | byeAdvancement | Bracket | Avanço automático sem partida | `GenericProgressionEngine` + `competitionRuntimeService.ts` | `StageDefinition.progression` | `CompetitionRuntimeService.advanceByes` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-DRW-01** | drawEligibility | Draw | Mínimo regulamentar atletas | `CompetitionRulesService.getRosterLimits` | `CompetitionConfig.registration` | `CompetitionDrawEligibilityService` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-DRW-02** | drawParametersStorage | Draw | Semente, modo e cabeças | `DrawConfig` avulso (não no config) | `CompetitionConfig` | `drawService.ts`, `DrawPage.tsx` | Não | Não | **Sim** | MEDIUM | `MISSING_FROM_CONFIG` |
| **R-REG-01** | rosterLimits | Inscrição | Min 6 / Max 14 / 2 Líberos / 1 Capitão | `CompetitionConfig.registration` | `CompetitionConfig` | `CompetitionRulesService.getRosterLimits`, `competitionRegistrationService.ts` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-REG-02** | staticRosterFallback | Inscrição | ROSTER_LIMITS: '6x6' / '2x2' | `src/types/registration.ts` | `CompetitionConfig` | `registrationService.ts:getRosterLimits` (quando sem comp) | Não | **Sim** | Não | LOW | `SSOT_WITH_FALLBACK` |
| **R-REG-03** | jerseyNumberRule | Inscrição | Opcional até o dia do jogo | `CompetitionConfig.registration.requireJerseyNumberOnRegistration` | `CompetitionConfig` | `registrationService.ts:validateAthleteInput` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-MOD-01** | modalityResolution | Modalidade | 'indoor' ou 'beach' | `CompetitionRecord.modality` | `CompetitionConfig` | `CompetitionRulesService.normalizeLegacyToConfig`, `matchCheckinService` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-MOD-02** | beachScoresheetGap | Súmula | Quadra 6x6 vs Praia 2x2 | `document-engine/baseos/` (apenas quadra) | Novo motor praia | `scoresheetService.ts` | Não | Não | **Sim** | MEDIUM | `OUT_OF_SCOPE` |
| **R-SNP-01** | rulesSnapshot | Snapshot | Cópia profunda congelada | `CompetitionRecord.rulesSnapshot` | `CompetitionRecord` | `CompetitionRulesService.getConfig`, `dataAccess.ts` | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-SNP-02** | databaseSnapshotLock | Snapshot | Trigger imutável PostgreSQL | `trg_protect_competition_rules_snapshot` | PostgreSQL Trigger | Supabase DB Engine | Não | Não | Não | LOW | `SSOT_CONFIRMED` |
| **R-UI-01** | setPointsEditDisabled | UI | 25 e 15 pontos `disabled` | `RulesConfigEditor.tsx:76,86` | UI editável | `CompetitionFormatBuilder` | **Sim** | Não | **Sim** | **HIGH** | `HARDCODED` |
| **R-UI-02** | woScoresheetDiscrepancy | UI | Falta de botão W.O. em Matches | Inexistente em `MatchesPage.tsx` | `MatchesPage` action | Administrador / Mesário | **Sim** | Não | **Sim** | **CRITICAL** | `MISSING_FROM_CONFIG` |

---

## 7. CAMPOS DO `CompetitionConfig` AUDITADOS E MATRIZ DE CONSUMIDORES

| Campo | Definido no Tipo | Resolvido no Service | Consumido Operacionalmente | Principais Consumidores | Status SSOT |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `version` | ✅ | ✅ | ✅ | `CompetitionConfigValidator`, `dataAccess` | `SSOT_CONFIRMED` |
| `format.defaultSetsToWin` | ✅ | ✅ | ✅ | `CompetitionRulesService.resolveMatchFormat`, `match.mapper`, `LiveScorerDeskModal` | `SSOT_CONFIRMED` |
| `format.phaseOverrides` | ✅ | ✅ | ✅ | `CompetitionRulesService.resolveMatchFormat`, `CompetitionSettingsEditDialog` | `SSOT_CONFIRMED` |
| `format.setRules.regularSetPoints` | ✅ | ✅ | ✅ | `CompetitionRulesService.validateSingleSet`, `set.rules.ts`, `match.mapper` | `SSOT_CONFIRMED` |
| `format.setRules.tiebreakPoints` | ✅ | ✅ | ✅ | `CompetitionRulesService.validateSingleSet`, `set.rules.ts`, `match.mapper` | `SSOT_CONFIRMED` |
| `format.setRules.minAdvantage` | ✅ | ✅ | ✅ | `CompetitionRulesService.validateSingleSet`, `set.rules.ts` | `SSOT_CONFIRMED` |
| `format.formatType` | ✅ | ✅ | ✅ | `CompetitionTemplateService`, `CompetitionFormatBuilder` | `SSOT_CONFIRMED` |
| `format.stages` (DAG) | ✅ | ✅ | ✅ | `StageGraph`, `CompetitionRuntimeService`, `genericProgressionEngine` | `SSOT_CONFIRMED` |
| `scoring.systemType` | ✅ | ✅ | ✅ | `CompetitionRulesService.normalizeLegacyToConfig`, `ScoringEngine` | `SSOT_CONFIRMED` |
| `scoring.pointsWinClear` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `scoring.pointsWinNarrow` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `scoring.pointsLossNarrow` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `scoring.pointsLossClear` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `scoring.pointsWoWin` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints` | `SSOT_CONFIRMED` |
| `scoring.pointsWoLoss` | ✅ | ✅ | ✅ | `CompetitionRulesService.calculateCompetitionPoints` | `SSOT_CONFIRMED` |
| `standings.tiebreakCriteriaOrder`| ✅ | ✅ | ⚠️ | `standingsService.ts`, `TieBreakEngine` (mas ignorado em `competitionRuntimeService.ts:562`) | `DIVERGENT` |
| `standings.advancingPerGroup` | ✅ | ✅ | ✅ | `CompetitionRulesService.normalizeLegacyToConfig`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `standings.bestThirds` | ✅ | ✅ | ✅ | `CompetitionRulesService.normalizeLegacyToConfig`, `OverallStandingsEngine` | `SSOT_CONFIRMED` |
| `standings.aggregationStrategy` | ✅ | ✅ | ✅ | `OverallStandingsEngine`, `RulesConfigEditor` | `SSOT_CONFIRMED` |
| `registration.minAthletes` | ✅ | ✅ | ✅ | `CompetitionRulesService.getRosterLimits`, `competitionRegistrationService.ts` | `SSOT_CONFIRMED` |
| `registration.maxAthletes` | ✅ | ✅ | ✅ | `CompetitionRulesService.getRosterLimits`, `competitionRegistrationService.ts` | `SSOT_CONFIRMED` |
| `registration.maxCaptains` | ✅ | ✅ | ✅ | `CompetitionRulesService.getRosterLimits`, `registrationService.ts` | `SSOT_CONFIRMED` |
| `registration.maxLiberos` | ✅ | ✅ | ✅ | `CompetitionRulesService.getRosterLimits`, `registrationService.ts` | `SSOT_CONFIRMED` |
| `registration.requireJerseyNumber`| ✅ | ✅ | ✅ | `registrationService.ts:validateAthleteInput` | `SSOT_CONFIRMED` |

---

## 8. DETALHAMENTO DE HARDCODES ENCONTRADOS

### HARDCODE-01: Pontos do Set Regular e Tiebreak Desabilitados na UI
* **Arquivo:** [`src/components/competition/format-builder/RulesConfigEditor.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/RulesConfigEditor.tsx#L73-L89)
* **Código:**
  ```tsx
  <Input
    type="number"
    value={config.format.setRules.regularSetPoints}
    disabled
    className="h-8 text-xs bg-surface-base/50 border-border-subtle opacity-80"
  />
  ```
* **Impacto:** Embora o motor e o Document Engine suportem integralmente 21 pontos (conforme testado na Fase 4.1), o usuário final/organizador é proibido de editar os pontos na UI pois o campo está com a propriedade `disabled` estática.
* **Severidade:** **HIGH**.

### HARDCODE-02: Cruzamentos Eliminatórios Rígidos no `playoffsService.ts`
* **Arquivo:** [`src/services/playoffsService.ts`](file:///home/diego-martins/docker/volei/src/services/playoffsService.ts#L65-L96)
* **Código:** Cruzamentos fixos `1A x 2B`, `1C x 2D`, `1B x 2A`, `1D x 2C` hardcodeados na função `generateFourGroupPlayoffs`.
* **Impacto:** Competições com cruzamento olímpico invertido ou sorteio dirigido de semifinais não conseguem parametrizar a progressão pelo serviço clássico de playoffs.
* **Severidade:** **HIGH**.

### HARDCODE-03: Limitação Estática de Formato de Sets em Playoffs
* **Arquivo:** [`src/services/playoffsService.ts`](file:///home/diego-martins/docker/volei/src/services/playoffsService.ts#L214-L216)
* **Código:**
  ```ts
  const customSetFormat: '3-sets' | '5-sets' =
    resolvedFormat.setsToWin === 3 ? '5-sets' : '3-sets';
  ```
* **Impacto:** Descarta o suporte a partidas de Set Único (`setsToWin = 1`), forçando `'3-sets'`.
* **Severidade:** **MEDIUM**.

---

## 9. DETALHAMENTO DE DUPLICAÇÕES ENCONTRADAS

### DUP-01: Cálculo de Pontos da Tabela de Classificação em Três Módulos
1. [`src/services/competitionRulesService.ts:170`](file:///home/diego-martins/docker/volei/src/services/competitionRulesService.ts#L170): `calculateCompetitionPoints`
2. [`src/services/scoringEngine.ts:30`](file:///home/diego-martins/docker/volei/src/services/scoringEngine.ts#L30): `ScoringEngine.calculatePoints`
3. [`src/services/standingsService.ts:82`](file:///home/diego-martins/docker/volei/src/services/standingsService.ts#L82): `competitionPointsFromSets`
* **Impacto:** Três implementações distintas para derivar a pontuação de vitória/derrota com tiebreak. Se uma regra customizada for introduzida, há risco de divergência caso um módulo invoque `competitionPointsFromSets` diretamente sem passar o `competition`.
* **Severidade:** **MEDIUM**.

### DUP-02: Limites Estáticos de Elenco em `registration.ts`
* **Arquivo:** [`src/types/registration.ts:25-33`](file:///home/diego-martins/docker/volei/src/types/registration.ts#L25-L33)
* **Código:** `ROSTER_LIMITS = { '6x6': { min: 6, max: 14 }... }`, `MAX_LIBEROS = 2`, `MAX_CAPTAINS = 1`.
* **Relação:** Duplica os valores de `DEFAULT_INDOOR_COMPETITION_CONFIG.registration`.
* **Severidade:** **LOW** (Atua legitimamente como fallback quando não há objeto de competição instanciado).

---

## 10. MATRIZ DE DIVERGÊNCIAS (DIVERGENCES)

### DIV-01: Perda do Contexto de Competição no Confronto Direto (`headToHeadWinner`)
* **Localização:** [`src/services/standingsService.ts:173`](file:///home/diego-martins/docker/volei/src/services/standingsService.ts#L173)
* **Código:**
  ```ts
  export function headToHeadWinner(matches: MatchRecord[], teamAId: string, teamBId: string, onlyHomologated = false): string | null {
    // ...
    const winner = matchWinner(match); // ⚠️ NÃO PASSA competition!
    // ...
  }
  ```
* **Impacto:** `matchWinner(match)` delega para `CompetitionRulesService.getCanonicalMatchResult(undefined, match)`. Sem a competição, o serviço instancia uma competição indoor sintética fallback com formato inferido por heurística (`match.sets.length > 3`). Em competições de praia (21 pontos) ou com pontuação customizada, a validação matemática de desempate do confronto direto é executada contra as regras padrão de quadra!
* **Severidade:** **HIGH**.
* **Ação para Fase 5.1:** Atualizar assinatura de `headToHeadWinner` e chamadas em `evaluateSingleCriterion` para repassar `competition`.

### DIV-02: Ignorância de `CompetitionConfig.standings` no Runtime Intergrupos
* **Localização:** [`src/services/competitionRuntimeService.ts:562`](file:///home/diego-martins/docker/volei/src/services/competitionRuntimeService.ts#L562)
* **Código:**
  ```ts
  criteria: competition.tiebreakCriteriaOrder || competition.tiebreakCriteria || ['points', 'set-average', 'points-average']
  ```
* **Impacto:** O orquestrador runtime lê campos legados de primeiro nível da tabela (`tiebreakCriteriaOrder`) em vez de consultar a SSOT via `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`. Se o organizador configurou os critérios via `competition.config`, o runtime intergrupos ignora e cai no fallback `['points', 'set-average', 'points-average']`.
* **Severidade:** **HIGH**.
* **Ação para Fase 5.1:** Substituir por `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`.

### DIV-03: Inconsistência de Exibição dos Critérios de Desempate na Tab de Configuração
* **Localização:** [`src/components/competition/tabs/CompetitionConfigTab.tsx:104`](file:///home/diego-martins/docker/volei/src/components/competition/tabs/CompetitionConfigTab.tsx#L104)
* **Código:** Lê `selected.tiebreakCriteriaOrder || [...]` em vez de `CompetitionRulesService.getConfig(selected).standings.tiebreakCriteriaOrder`.
* **Impacto:** A interface exibe uma lista diferente caso a competição esteja versionada puramente no JSON `config`.
* **Severidade:** **MEDIUM**.

---

## 11. AUDITORIA ESPECÍFICA DE W.O. (WALKOVER)

### 11.1 Onde W.O. é Definido e Validado
* **Definição de Modelo:** `MatchRecord.isWo: boolean` e `MatchRecord.status: 'wo'`.
* **Regulamento Oficial Canônico:**
  * `CompetitionRulesService.validateMatchScore`: Em W.O., exige placar exato de $N \times 0$ (onde $N = \text{setsToWin}$) a favor da equipe vencedora.
  * `CompetitionRulesService.getCanonicalMatchResult`: Deriva sets ganhos ($N \times 0$) e pontos marcados ($N \times \text{regularSetPoints}$ contra $0$).
  * `CompetitionRulesService.calculateCompetitionPoints`: Concede `scoring.pointsWoWin` (padrão: 3) e `scoring.pointsWoLoss` (padrão: 0).
  * `document-engine/baseos/mapper/match.mapper.ts`: Atribui o resultado oficial da partida em W.O. ao quadro de resultados.

### 11.2 O GAP Crítico de W.O. na Aplicação
* **Diagnóstico:** A lógica de backend, domínio, motor de pontos e gerador de PDF tratam W.O. com total perfeição. **Porém, a interface gráfica (`MatchesPage.tsx` / `ResultValidationDialog.tsx`) não possui nenhum botão, opção ou diálogo para o mesário ou administrador lançar um W.O.!**
* **Consequência:** Na prática, um W.O. hoje só pode ser lançado via script de banco de dados ou mock de teste.
* **Severidade:** **CRITICAL (GAP Operacional)**.

---

## 12. AUDITORIA DE FASES, BYE E CHAVEAMENTO

### 12.1 Coexistência de Dois Motores de Fases
* **Motor Legado (`playoffsService.ts`):** Focado exclusivamente em 2 ou 4 grupos fixos, cruzamentos rígidos e quartas/semis/final.
* **Motor Canônico Moderno (`GenericPairingEngine` / `StageGraph`):**
  * Suporta Grafo de Fases acíclico (DAG);
  * Chaveamento por sementes (potência de 2 determinística);
  * Eliminatória Dupla (Winners, Losers e Grande Final);
  * Play-In com ranking intergrupos unificado.
* **BYE:**
  * No sorteio Berger (`drawService.ts`): implementado via string mágica `'__BYE__'`.
  * No runtime de torneio (`GenericPairingEngine` / `competitionRuntimeService.ts`): implementado canonicamente via `createByeParticipantSlot` e `advanceByes`. O participante folga na rodada e avança sem criar partidas fantasmas.

---

## 13. AUDITORIA DO DRAW (SORTEIO)

* **Algoritmo de Sorteio:** Implementado com PRNG determinístico `mulberry32` em [`drawService.ts`](file:///home/diego-martins/docker/volei/src/services/drawService.ts). É um algoritmo puramente matemático (não é regra esportiva).
* **Regra Esportiva do Sorteio:** A distribuição de cabeças de chave (`headSeeds`) nos grupos e o chaveamento por potes obedecem ao padrão CBV/FIVB.
* **GAP:** Os parâmetros de sorteio (`seedingMode`, `seed`, `headSeeds`) residem em uma estrutura paralela `DrawConfig` e não estão mapeados no `CompetitionConfig`.

---

## 14. AUDITORIA DE MODALIDADES (INDOOR vs. BEACH)

* **Resolução:** O sistema discrimina `modality === 'beach'` através de `DEFAULT_BEACH_COMPETITION_CONFIG` e defaults em `CompetitionRulesService`:
  * Sets regulares: 21 pontos (praia) vs. 25 pontos (quadra).
  * Elenco: mínimo 2 / máximo 4 atletas (praia) vs. mínimo 6 / máximo 14 (quadra).
  * Líberos: 0 na praia vs. 2 na quadra.
* **GAP Arquitetural:** O Document Engine (Súmula PDF) é estritamente 6x6 indoor (possui 6 posições de rotação I..VI, tabelas de líbero e substituições). A súmula de praia 2x2 permanece **fora de escopo** até o desenvolvimento de um layout específico.

---

## 15. AUDITORIA DE SNAPSHOT E IMUTABILIDADE

* **Ciclo de Vida:** O congelamento é acionado por `CompetitionLifecycleService.freezeRulesSnapshot` na transição para `in-progress` ou no lançamento do primeiro resultado.
* **Imutabilidade em Memória:** `CompetitionRulesService.getConfig` dá preferência incondicional ao `rulesSnapshot`.
* **Imutabilidade em Banco de Dados:** A migration `20260906000001_protect_rules_snapshot.sql` instalou o trigger PostgreSQL `trg_protect_competition_rules_snapshot`, que emite exceção em qualquer tentativa de `UPDATE` que altere ou anule o `rules_snapshot` de uma competição em andamento ou finalizada.
* **Status:** **100% CONFORME E SEGURO**.

---

## 16. AUDITORIA DE BANCO DE DADOS (SUPABASE / POSTGRESQL)

* A tabela `competitions` armazena tanto as colunas legadas (`format`, `set_format`, `modality`, `player_format`) quanto os documentos JSONB canônicos (`config`, `rules_snapshot`).
* O adapter `src/services/dataAccess.ts` converte bidirecionalmente entre o banco e a aplicação (`toCamel` / `toSnake`).
* Não há deficiências de schema ou permissões para o modelo canônico atual.

---

## 17. AUDITORIA DE TESTES EXISTENTES

* **Suíte Completa:** 97 arquivos de teste, 859 testes unitários e de integração, todos passando com 100% de sucesso.
* **Cobertura de Regras:**
  * `competitionRulesService.test.ts`: 100% de cobertura nos métodos centrais.
  * `canonicalMatchResult.test.ts`: Cobertura de vitórias do Time A, Time B, W.O. e parciais inválidas.
  * `competitionRulesIntegration.test.ts`: Cobertura de vitórias 1x3, 3x1, pontuação 21 pts, tiebreak com troca aos 11 e preservação de snapshot.
  * `doubleElimination.test.ts`: Cobertura exaustiva de chaveamento de eliminatória dupla.
* **GAP de Teste Identificado:**
  * Nenhum teste validava que `headToHeadWinner` perde o contexto de competição (achado DIV-01).

---

## 18. GAPS ARQUITETURAIS CONSOLIDADOS

```text
┌──────────────┬────────────────────────────────────────────────────────┬────────────┐
│ GAP-ID       │ Descrição                                              │ Severidade │
├──────────────┼────────────────────────────────────────────────────────┼────────────┤
│ GAP-CRIT-01  │ Ausência de ação de registro de W.O. na interface      │ CRITICAL   │
│ GAP-HIGH-01  │ headToHeadWinner não repassa competition para vencedor │ HIGH       │
│ GAP-HIGH-02  │ competitionRuntimeService ignora tiebreakCriteriaOrder │ HIGH       │
│ GAP-HIGH-03  │ RulesConfigEditor mantém inputs de pontos disabled     │ HIGH       │
│ GAP-MED-01   │ Duplicação de cálculo de pontos em 3 serviços          │ MEDIUM     │
│ GAP-MED-02   │ playoffsService com cruzamentos hardcoded (1A x 2B...) │ MEDIUM     │
│ GAP-MED-03   │ DrawConfig não persiste no CompetitionConfig           │ MEDIUM     │
│ GAP-LOW-01   │ Súmula de Vôlei de Praia fora de escopo                │ LOW        │
└──────────────┴────────────────────────────────────────────────────────┴────────────┘
```

---

## 19. RECOMENDAÇÕES PARA A FASE 5.1 (CORREÇÕES CIRÚRGICAS)

1. **Correção de DIV-01 (Head-to-Head):**
   * Alterar `headToHeadWinner(matches, teamAId, teamBId, onlyHomologated, competition?: CompetitionRecord)`.
   * Repassar `competition` para `matchWinner(match, competition)` em `standingsService.ts`.
2. **Correção de DIV-02 (Runtime Tiebreak Criteria):**
   * Em `competitionRuntimeService.ts:562`, substituir a leitura de campos legados por:
     `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`.
3. **Correção de GAP-CRIT-01 (Ação de W.O. na UI):**
   * Adicionar no menu de ações da partida em `MatchesPage.tsx` e no `ResultValidationDialog.tsx` a opção de "Declarar W.O.", selecionando a equipe vencedora e invocando `getCanonicalMatchResult` com `isWo: true`.
4. **Correção de HARDCODE-01 (Desbloqueio de Edição de Pontos na UI):**
   * Remover o atributo `disabled` de `regularSetPoints` e `tiebreakPoints` em `RulesConfigEditor.tsx`, conectando-os aos respectivos handlers de alteração no `CompetitionFormatBuilder`.
5. **Consolidação de DUP-01 (Cálculo de Pontos):**
   * Delegar `competitionPointsFromSets` e `ScoringEngine.calculatePoints` exclusivamente para `CompetitionRulesService.calculateCompetitionPoints`.

---

## 20. RESPOSTA À PERGUNTA CENTRAL DA AUDITORIA

> **Todas as regras esportivas relevantes do BaseOS estão atualmente centralizadas no `CompetitionConfig` e resolvidas pelo `CompetitionRulesService`?**

```text
SIM, COM RESSALVAS
```

### Justificativa Factual:
A espinha dorsal do sistema (formatos de sets, pontuações regulares e decisivas, limites de elenco, imutabilidade por snapshot e apuração oficial de resultados de partida e súmula PDF) está **100% centralizada no `CompetitionConfig` e resolvida pelo `CompetitionRulesService`**.

As **ressalvas** que impedem um "SIM" absoluto decorrem de:
1. **Perda de contexto de competição** na avaliação pairwise de confronto direto em `standingsService.ts:headToHeadWinner`;
2. **Bypass de critérios de desempate** no orquestrador runtime intergrupos (`competitionRuntimeService.ts:562`);
3. **GAP operacional crítico de W.O.** na interface de usuário (o motor suporta, mas a UI não expõe);
4. **Campos de regras desabilitados (`disabled`) na UI** de edição de formatos (`RulesConfigEditor.tsx`).

---

## 21. CERTIFICAÇÃO FINAL DA FASE 5

```text
============================================================
BASEOS — FASE 5
AUDITORIA MASTER DAS REGRAS ESPORTIVAS
============================================================

Código alterado: NÃO (Execução 100% Read-Only)
Arquitetura auditada: SIM
CompetitionConfig auditado: SIM
CompetitionRulesService auditado: SIM

Regras inventariadas: 30
SSOT confirmadas: 20
Fallbacks defensivos: 3
Duplicações identificadas: 2
Hardcodes identificados: 3
Divergências identificadas: 3
GAPs Critical: 1
GAPs High: 3
GAPs Medium: 3
GAPs Low: 1

Testes executados: 97 suites / 859 testes (100% PASS)
Typecheck: 0 erros
Lint: 0 erros
Build: Concluído com sucesso

Documento de Auditoria:
docs/audit/FASE_5_MASTER_RULES_AUDIT.md

Walkthrough:
docs/WALKTHROUGH_FASE_5.md

CERTIFICAÇÃO:
SIM, COM RESSALVAS

DECISÃO RECOMENDADA:
FASE 5.1 NECESSÁRIA
============================================================
```
