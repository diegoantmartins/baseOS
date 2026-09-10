# BASEOS — WALKTHROUGH FASE 5.1

## ELIMINAÇÃO DOS BYPASSES DO COMPETITIONRULESSERVICE

---

## 1. RESUMO EXECUTIVO

A **Fase 5.1 — Eliminação dos Bypasses do CompetitionRulesService** foi concluída com sucesso e homologada com **100% de conformidade**.

O objetivo desta fase foi realizar uma intervenção cirúrgica e rigorosamente delimitada para **eliminar todos os pontos onde o `CompetitionRulesService` deixava de ser a autoridade normativa única (Single Source of Truth)** para as regras esportivas e critérios de classificação no BaseOS.

### Métricas de Homologação

| Verificação | Comando | Resultado |
|---|---|---|
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | 🟢 **0 erros** |
| **Lint** | `npm run lint` | 🟢 **0 erros** (1 aviso inofensivo de hook pré-existente) |
| **Testes Unitários e Integração** | `npm test -- --run` | 🟢 **864 testes passando** (98 suítes) |
| **Suíte Específica Fase 5.1** | `npm test -- src/test/competitionRulesBypasses.test.ts --run` | 🟢 **5 testes passando** |
| **Build de Produção** | `npm run build` | 🟢 **Compilação bem-sucedida** (`dist/` gerado) |
| **Impacto Visual / Súmula** | Inspeção de arquivos | 🟢 **0 alterações visuais; Súmula Canônica intocada** |

---

## 2. CHECKLIST DE HOMOLOGAÇÃO DA FASE 5.1

- [x] **`headToHeadWinner` preserva `CompetitionRecord`**: O parâmetro opcional `competition?: CompetitionRecord` foi adicionado à assinatura de `headToHeadWinner` e propagado para `matchWinner(match, competition)`.
- [x] **`matchWinner` recebe o contexto da competição**: `matchWinner(match, competition)` recebe o contexto e delega para `CompetitionRulesService.getCanonicalMatchResult(competition, match)`.
- [x] **`computeStandings` propaga `competition`**: A ordenação principal pairwise agora encaminha `competition` para `evaluateSingleCriterion`, que por sua vez entrega ao `headToHeadWinner`.
- [x] **`TieBreakEngine` propaga `competition`**: O método `resolveHeadToHead` em `tieBreakEngine.ts` repassa `competition` ao invocar `headToHeadWinner`.
- [x] **`competitionRuntimeService` não lê critérios legados diretamente**: A leitura direta de `competition.tiebreakCriteriaOrder || competition.tiebreakCriteria` foi substituída por `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`.
- [x] **`publicCompetitionService` não sobrepõe critérios canônicos com legado**: Removida a sobreposição manual `criteria: rawComp.tiebreakCriteriaOrder ?? ...`; agora passa `{ competition: rawComp }`, permitindo que `computeStandings` resolva a autoridade canônica.
- [x] **`CompetitionConfigTab` utiliza resolução canônica**: A leitura de critérios ordenados foi migrada para `CompetitionRulesService.getConfig(selected).standings?.tiebreakCriteriaOrder` sem nenhuma alteração no layout visual ou CSS.
- [x] **`competitionPointsFromSets` não possui algoritmo esportivo paralelo**: Agora delega integralmente para `CompetitionRulesService.calculateCompetitionPoints(...)`, aceitando `competition?: CompetitionRecord` e mantendo fallback defensivo padronizado.
- [x] **Teste de divergência canônico vs legado passa**: Implementado em `src/test/competitionRulesBypasses.test.ts`, demonstrando matematicamente que a ordem canônica (`sets-ratio` antes de `head-to-head`) prevalece sobre o legado inverso.
- [x] **Nenhuma nova autoridade de resolução foi criada**: `OverallStandingsEngine` permaneceu como motor de cálculo puro recebendo `criteria` de seu chamador, mantendo apenas fallback técnico defensivo `options?.criteria ?? DEFAULT_TECHNICAL_CRITERIA`.
- [x] **Auditoria global pós-implementação foi executada**: Busca sistemática realizada por todas as variantes de símbolos de regras esportivas com classificação semântica exaustiva.
- [x] **Todos os bypasses residuais foram classificados**: Nenhum bypass operacional ativo remanescente.
- [x] **Nenhuma alteração visual foi realizada**: Zero modificações de estilo, classes Tailwind ou layouts na interface.
- [x] **Súmula Canônica permaneceu intacta**: Nenhum arquivo do Document Engine (`src/document-engine/baseos/`) foi alterado.
- [x] **Testes completos passam**: 864 de 864 testes passaram.
- [x] **Typecheck passa**: 0 erros no compilador TypeScript.
- [x] **Lint passa**: 0 erros no ESLint.
- [x] **Build passa**: Bundle gerado com sucesso pelo Vite.
- [x] **Walkthrough gerado**: Este documento.

---

## 3. DETALHAMENTO CIRÚRGICO DAS ALTERAÇÕES

### 3.1. Propagação de Contexto no Confronto Direto (H2H)

**Arquivos:** `src/services/standingsService.ts`, `src/services/tieBreakEngine.ts`

#### O Problema Anterior (Identificado na Fase 5)
```text
computeStandings
   ↓
evaluateSingleCriterion (sem competition)
   ↓
headToHeadWinner (sem competition)
   ↓
matchWinner(match) ❌ Perdia o contexto da competição
   ↓
getCanonicalMatchResult(undefined, match)
   ↓
Fallback sintético indoor (mesmo para vôlei de praia ou regulamentos customizados)
```

#### A Solução Canônica Implementada
```text
computeStandings(competition)
   ↓
evaluateSingleCriterion(..., competition)
   ↓
headToHeadWinner(..., competition)
   ↓
matchWinner(match, competition)
   ↓
CompetitionRulesService.getCanonicalMatchResult(competition, match)
```

No `TieBreakEngine.ts` (linha 207):
```typescript
// Antes:
const winnerId = headToHeadWinner(matches, teamA.teamId, teamB.teamId, onlyHomologated);

// Depois:
const winnerId = headToHeadWinner(matches, teamA.teamId, teamB.teamId, onlyHomologated, competition);
```

---

### 3.2. Resolução Canônica em `competitionRuntimeService`

**Arquivo:** `src/services/competitionRuntimeService.ts` (linhas 556-566)

#### Antes:
```typescript
criteria: competition.tiebreakCriteriaOrder || competition.tiebreakCriteria || ['points', 'set-average', 'points-average'],
```
*Bypass:* Lia campos legados desnormalizados diretamente no objeto `competition`, ignorando `rulesSnapshot` ou `config.standings.tiebreakCriteriaOrder`.

#### Depois:
```typescript
const canonicalConfig = CompetitionRulesService.getConfig(competition);
const criteria = canonicalConfig.standings.tiebreakCriteriaOrder;
const overall = OverallStandingsEngine.computeOverallStandings(
  groupStandings,
  {
    competition,
    matches: groupMatches,
    criteria,
  },
);
```
*Garantia:* Resolução centralizada no `CompetitionRulesService`. O `OverallStandingsEngine` apenas recebe e executa os critérios, sem atuar como autoridade concorrente.

---

### 3.3. Eliminação da Sobreposição Legada em `publicCompetitionService`

**Arquivo:** `src/services/publicCompetitionService.ts` (linhas 320 e 418)

#### Antes:
```typescript
// Linha 321 e 419:
criteria: rawComp.tiebreakCriteriaOrder ?? rawComp.config?.standings?.tiebreakCriteriaOrder,
competition: rawComp,
```
*Bypass:* Sobrepunha a autoridade canônica forçando o campo legado `tiebreakCriteriaOrder` mesmo quando `config` ou `rulesSnapshot` existiam.

#### Depois:
```typescript
// Linha 320:
const standings = computeStandingsByGroup(standingInputs, matches, {
  competition: rawComp,
});

// Linha 418:
return computeStandingsByGroup(standingInputs, matches, {
  competition: rawComp ?? undefined,
});
```
*Garantia:* `computeStandings` recebe `competition` e resolve nativamente através de `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`.

---

### 3.4. Resolução Canônica na Interface (`CompetitionConfigTab` e Páginas)

**Arquivo:** `src/components/competition/tabs/CompetitionConfigTab.tsx` (linha 104)

#### Antes:
```tsx
{(selected.tiebreakCriteriaOrder || [ ... ]).map((crit, idx) => (
```

#### Depois:
```tsx
{(CompetitionRulesService.getConfig(selected).standings?.tiebreakCriteriaOrder || [ ... ]).map((crit, idx) => (
```

Também foram atualizadas as chamadas em:
- `src/pages/StandingsPage.tsx`: removida sobreposição `criteria: selectedCompetition.tiebreakCriteriaOrder`, passando `{ competition: selectedCompetition }`, e no badge de critérios exibindo a lista via `CompetitionRulesService.getConfig(selectedCompetition)`.
- `src/pages/ReportsPage.tsx`: removido `criteria: competition.tiebreakCriteriaOrder`, passando `{ competition }`.
- `src/pages/TeamRosterRegistrationPage.tsx`: removido `criteria: competition.tiebreakCriteriaOrder`, passando `{ competition }`.
- `src/pages/CompetitionsPage.tsx`: removido `criteria: selected.tiebreakCriteriaOrder`, passando `{ competition: selected }`.
- `src/pages/MatchesPage.tsx`: removido `criteria: comp.tiebreakCriteriaOrder`, passando `{ competition: comp }`.

---

### 3.5. Unificação e Eliminação de Código Paralelo em `competitionPointsFromSets`

**Arquivo:** `src/services/standingsService.ts` (linhas 82-97 e 152-158)

#### Antes:
A função continha um cálculo `switch` duplicado e não recebia `competition`. O `accumulateStats` continha uma bifurcação inline:
```typescript
const points = competition
  ? CompetitionRulesService.calculateCompetitionPoints(competition, setsWon, setsLost, canonical.isWo)
  : competitionPointsFromSets(setsWon, setsLost);
```

#### Depois:
```typescript
export function competitionPointsFromSets(
  setsWon: number,
  setsLost: number,
  isWo = false,
  competition?: CompetitionRecord,
): number {
  if (competition) {
    return CompetitionRulesService.calculateCompetitionPoints(competition, setsWon, setsLost, isWo);
  }
  return CompetitionRulesService.calculateCompetitionPoints(
    { modality: 'indoor' } as CompetitionRecord,
    setsWon,
    setsLost,
    isWo,
  );
}
```
E no `accumulateStats`:
```typescript
const points = competitionPointsFromSets(setsWon, setsLost, canonical.isWo, competition);
stats.competitionPoints += points;
```
*Garantia:* Quando `competition` está disponível no caller, ele é preservado e propagado; quando invocado de forma isolada (ex: testes legados de pontos), aciona o fallback defensivo que delega ao `CompetitionRulesService`, eliminando qualquer duplicação algorítmica.

---

## 4. O TESTE DE DIVERGÊNCIA PROPOSITAL

Localizado em `src/test/competitionRulesBypasses.test.ts`, este teste valida formalmente a precedência normativa:

### Cenário Configurado
- **Competição:** 3 equipes (Alpha, Beta, Delta) com pontuação FIVB padrão.
- **Configuração Legada (desnormalizada):**
  `tiebreakCriteriaOrder: ['points', 'head-to-head', 'sets-ratio']`
- **Configuração Canônica (`config.standings`):**
  `tiebreakCriteriaOrder: ['points', 'sets-ratio', 'head-to-head']`

### Resultados das Partidas
- Alpha 3 x 2 Beta (Alpha: 2 pts, Beta: 1 pt). **Alpha venceu o confronto direto!**
- Alpha 3 x 2 Delta (Alpha: 2 pts, Delta: 1 pt). Total Alpha: 4 pts, sets 6/4 (razão: 1.500).
- Beta 3 x 0 Delta (Beta: 3 pts, Delta: 0 pt). Total Beta: 4 pts, sets 5/3 (razão: 1.667).

### Conclusão Matemática
- Se o motor lesse o campo **LEGADO**, `head-to-head` desempata antes e **Alpha ficaria em 1º lugar**.
- Como o motor obedece estritamente à **AUTORIDADE CANÔNICA**, `sets-ratio` desempata antes e **Beta (1.667 > 1.500) fica em 1º lugar**.

O teste passou com sucesso absoluto:
```typescript
expect(standings[0].teamId).toBe('team-b');
expect(standings[0].position).toBe(1);
expect(standings[1].teamId).toBe('team-a');
expect(standings[1].position).toBe(2);
```

---

## 5. TESTE DE PRAIA: ESCOPO E NÃO-REGRESSÃO

Conforme diretriz aprovada:
> *"O teste de praia deve validar exclusivamente que o contexto CompetitionRecord é propagado até a resolução das regras, sem certificar suporte completo à modalidade praia no Document Engine."*

O teste em `src/test/competitionRulesBypasses.test.ts` valida:
1. `CompetitionRecord` com `modality: 'beach'` e `regularSetPoints: 21`;
2. Partida com sets terminando em 21x18 e 21x16;
3. `headToHeadWinner([beachMatch], teamA, teamB, false, beachComp)` entrega o vencedor correto com base nas regras de 21 pontos;
4. `CompetitionRulesService.getCanonicalMatchResult(beachComp, beachMatch)` valida a conclusão em 2 sets e declara vencedor oficial sem falsos erros de pontuação regular.

---

## 6. AUDITORIA GLOBAL PÓS-IMPLEMENTAÇÃO

Busca sistemática de termos de regras esportivas executada após as correções:

| Símbolo Pesquisado | Ocorrências Encontradas | Classificação Semântica | Status |
|---|---|---|---|
| `tiebreakCriteriaOrder` | Tipos, schemas, validador, testes, `CompetitionRulesService.getConfig`, `standingsService` | **CANÔNICA & SCHEMA** — Ocorrências operacionais leem via `CompetitionRulesService.getConfig`. Páginas e serviços consom via adapter centralizado. | 🟢 APROVADO |
| `tiebreakCriteria` | `entities.ts`, readiness check legados, testes | **LEGACY COMPATIBILITY** — Mantido apenas como tipo opcional e verificação defensiva de legados no readiness. Zero chamadas operacionais ativas. | 🟢 APROVADO |
| `calculateCompetitionPoints` | `CompetitionRulesService.ts`, `standingsService.ts`, testes | **CANÔNICA** — Única implementação do cálculo de pontos esportivos. Delegado por `competitionPointsFromSets`. | 🟢 APROVADO |
| `calculatePoints` | `scoringEngine.ts`, `scoringEngine.test.ts`, `e2eSystemLifecycle.test.ts` | **CANÔNICA SCORING ENGINE** — Avaliação de pontuação pura por `ScoringConfig` (alvo de unificação na Fase 5.2). | 🟢 DOCUMENTADO |
| `competitionPointsFromSets` | `standingsService.ts`, `standingsService.test.ts`, `competitionRulesBypasses.test.ts` | **ADAPTER DELEGANTE** — Encaminha `competition` ao `CompetitionRulesService` ou executa fallback defensivo. | 🟢 APROVADO |
| `matchWinner` | `standingsService.ts`, `standingsService.test.ts`, `competitionRulesBypasses.test.ts` | **CANÔNICA** — Recebe `competition?: CompetitionRecord` e delega para `CompetitionRulesService.getCanonicalMatchResult`. | 🟢 APROVADO |
| `headToHeadWinner` | `standingsService.ts`, `tieBreakEngine.ts`, testes | **CANÔNICA** — Recebe e propaga `competition?: CompetitionRecord` para `matchWinner`. | 🟢 APROVADO |
| `setsWon` / `setsLost` | Contratos `CanonicalMatchResult`, `TeamStandingResult` e engines de desempate | **PROJEÇÃO CANÔNICA** — Campos matemáticos derivados do resultado canônico oficial. | 🟢 APROVADO |
| `regularSetPoints` | `competitionConfig.ts`, `competitionRulesService.ts`, validador e testes | **CANÔNICA SSOT** — Resolvido centralizadamente via `resolveMatchFormat` a partir do `CompetitionConfig`. | 🟢 APROVADO |
| `tiebreakPoints` / `minAdvantage` | `competitionConfig.ts`, `competitionRulesService.ts`, validador e testes | **CANÔNICA SSOT** — Configuração pura das regras de set. Zero hardcodes arbitrários em serviços consumidores. | 🟢 APROVADO |

**Bypasses Operacionais Identificados:** **0 (ZERO)**.

---

## 7. INTEGRIDADE DA SÚMULA CANÔNICA E DO BASELINE VISUAL

- **Nenhum arquivo em `src/document-engine/baseos/` foi alterado.**
- **Nenhum arquivo em `src/components/` teve classes CSS, JSX de layout ou tipografia alterados.**
- Os 6 PDFs oficiais reais de inspeção gerados no teste `generateInspectionPdfs.test.ts` continuam sendo emitidos e passando na suíte de testes com 100% de integridade geométrica.

---

## 8. CONCLUSÃO E PRÓXIMOS PASSOS

A **Fase 5.1** cumpriu rigorosamente seu papel arquitetural:
1. Eliminou todos os bypasses onde o `CompetitionRulesService` deixava de atuar como autoridade única.
2. Blindou o motor contra segundas autoridades em cascata (`OverallStandingsEngine`).
3. Comprovou matematicamente a precedência da configuração canônica sobre os campos legados.
4. Manteve 100% dos 864 testes do sistema verdes e a compilação de produção intacta.

### Sequência Roadmap Arquitetural:
- [x] **Fase 5** — Auditoria Master SSOT das Regras Esportivas
- [x] **Fase 5.1** — Eliminação dos Bypasses do CompetitionRulesService (CONCLUÍDA E HOMOLOGADA)
- [ ] **Fase 5.2** — Unificação da Pontuação da Classificação (`ScoringEngine` vs `CompetitionRulesService.calculateCompetitionPoints`)
- [ ] **Fase 5.3** — W.O. End-to-End
- [ ] **Fase 5.4** — Editor das Regras Esportivas
- [ ] **Fase 5.5** — Playoffs / Motores Legados
- [ ] **Fase 5.6** — `DrawConfig`
- [ ] **Futuro** — Vôlei de Praia Completo no Document Engine
