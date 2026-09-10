# BASEOS — WALKTHROUGH DE HOMOLOGAÇÃO

## FASE 5.2 — AUDITORIA + UNIFICAÇÃO DA PONTUAÇÃO DA CLASSIFICAÇÃO

**Sistema:** BaseOS  
**Fase:** 5.2  
**Status:** HOMOLOGADO COM SUCESSO 🟢  
**Data:** 09/09/2026  
**Ambiente:** Linux (docker/volei), Node.js, Vite, TypeScript, React 18, Vitest  

---

### 1. RESUMO EXECUTIVO

A **Fase 5.2** consolidou a governança e a autoridade matemática do cálculo de pontos da classificação do BaseOS, sanando uma divergência sutil de responsabilidades entre o `ScoringEngine` e o `CompetitionRulesService`.

Principais entregas:
1. **Unificação Normativa e Aritmética:** O `CompetitionRulesService` é a autoridade normativa única (SSOT) que determina *qual configuração de regras* rege uma competição (incluindo `rulesSnapshot` congelado). O `ScoringEngine` é o motor puro e determinístico que calcula *quantos pontos cada equipe recebe* dada uma configuração de pontuação (`ScoringSystemConfig`).
2. **Eliminação de Duplicação Aritmética (DIV-01):** Eliminados os ramos condicionais repetidos em `CompetitionRulesService.calculateCompetitionPoints`, delegando a resolução estritamente para `ScoringEngine.calculateTeamPoints`.
3. **Correção do Bug do Formato de 1 Set (DIV-02):** Corrigido o bug na detecção de vitória/derrota apertada. Anteriormente, em partidas de set único (`setsToWin = 1`), o placar de 1x0 possuía diferença `1 - 0 = 1`, o que disparava erroneamente a pontuação de tie-break (`pointsWinNarrow = 2` e `pointsLossNarrow = 1`). A regra agora exige que o adversário/equipe tenha vencido ao menos 1 set (`setsLost > 0` para vencedor, `setsWon > 0` para perdedor) para caracterizar vitória/derrota apertada (tie-break). Placar 1x0 concede pontuação limpa (`pointsWinClear = 3`, `pointsLossClear = 0`).
4. **Resolução Consistente de Configuração Pública (DIV-03):** `sanitizePublicCompetition` em `publicCompetitionService.ts` foi alinhado para consumir `CompetitionRulesService.getConfig(comp)`, respeitando snapshots congelados.
5. **Preservação Integral de Documentos Oficiais:** O Document Engine (`src/document-engine/baseos/`), a Súmula Canônica e a Ordem de Saque Canônica permaneceram 100% intocados.
6. **Validação Quádrupla 100% Verde:** Todos os testes unitários, de integração e regressão passaram (101 arquivos, 898 testes). Build de produção e checagem de tipos sem qualquer erro.

---

### 2. ARQUITETURA FINAL DE CÁLCULO DE PONTOS

A separação de responsabilidades foi consagrada com clareza cristalina:

```
┌─────────────────────────────────────────────────────────────┐
│                 CompetitionRecord (ou Snapshot)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │   CompetitionRulesService.getConfig  │ (SSOT Normativo:
            │      (resolve rulesSnapshot,         │  "Qual regra esta
            │       defaults indoor/beach)         │   competição usa?")
            └──────────────────┬───────────────────┘
                               │
                               ▼
                     ScoringSystemConfig
                               │
            ┌──────────────────┴───────────────────┐
            │                                      │
            ▼                                      ▼
┌───────────────────────────────┐      ┌───────────────────────────────┐
│ ScoringEngine.calculatePoints │      │ScoringEngine.calculateTeamPoints│
│  (opera sobre CanonicalResult │      │ (setsWon, setsLost, isWo,     │
│   e distribui pointsA/pointsB)│      │  scoringConfig)               │
└───────────────┬───────────────┘      └───────────────┬───────────────┘
                │ (Motor Puro Matemático:              │
                │  "Dada esta config e placar,         │
                │   quantos pontos atribuir?")         │
                ▼                                      ▼
      OverallStandingsEngine                CompetitionRulesService.
     (Cálculo canônico geral)               calculateCompetitionPoints
                                                       │
                                                       ▼
                                             competitionPointsFromSets
                                            (Adapter de compatibilidade)
                                                       │
                                                       ▼
                                                StandingsService
```

#### Princípios Arquiteturais Consolidados:
- **`CompetitionRulesService`**: Fachada normativa. Responde *"qual regra esta competição utiliza?"*. Conhece entidades de banco/domínio (`CompetitionRecord`, `rulesSnapshot`). Não duplica fórmulas aritméticas.
- **`ScoringEngine`**: Motor matemático puro. Responde *"dada esta configuração e este placar, qual é o resultado aritmético?"*. Não conhece banco, entidades externas ou storage. Operação pura: `(entrada) => saída`.
- **`competitionPointsFromSets`**: Mantido como adapter legítimo em `standingsService.ts`, delegando exclusivamente para `CompetitionRulesService.calculateCompetitionPoints`.
- **Guarda Defensiva de Estados Incompletos:** Voleibol não possui empate esportivo como resultado de jogo finalizado. A checagem `if (setsWon === setsLost) return 0;` em `ScoringEngine.calculateTeamPoints` opera exclusivamente como proteção defensiva contra placares inválidos ou partidas incompletas.

---

### 3. AUDITORIA PRÉ-IMPLEMENTAÇÃO (ACHADOS E DIVERGÊNCIAS)

Antes de realizar qualquer intervenção em código, foi executada uma auditoria minuciosa mapeando todos os pontos de cálculo e distribuição de pontos da competição.

Foram identificadas 3 divergências centrais:

| ID | Localização | Natureza | Descrição |
|:---|:------------|:---------|:----------|
| **DIV-01** | `competitionRulesService.ts:167-184` vs `scoringEngine.ts:31-62` | Duplicação de branches aritméticos | `CompetitionRulesService.calculateCompetitionPoints` continha branches `if (setsWon > setsLost) ...` replicando a lógica de `ScoringEngine`. Qualquer ajuste de regra precisava ser mantido em dois locais. |
| **DIV-02** | `scoringEngine.ts:47` & `competitionRulesService.ts:175` | Bug conceitual no formato de 1 set (`setsToWin = 1`) | A condição para vitória/derrota apertada era simplistamente `diff === 1` (`setsWon - setsLost === 1`). Em 1x0, `1 - 0 = 1`, o que pontuava como vitória apertada (`2 pts`) e derrota apertada (`1 pt`), violando a regra esportiva onde 1x0 é vitória limpa (`3 pts`) e derrota zerada (`0 pts`). |
| **DIV-03** | `publicCompetitionService.ts:159-160` | Bypass potencial de snapshot | `sanitizePublicCompetition` lia `comp.config?.scoring` diretamente sem passar por `CompetitionRulesService.getConfig(comp)`, arriscando expor regras dessincronizadas do `rulesSnapshot`. |

---

### 4. MAPEAMENTO DE CALLERS

#### Antes da Fase 5.2:
- `OverallStandingsEngine` ➔ `ScoringEngine.calculatePoints(canonical, scoringConfig)`
- `StandingsService.competitionPointsFromSets` ➔ `CompetitionRulesService.calculateCompetitionPoints(comp, w, l, wo)` ➔ *lógica aritmética local duplicada*
- `sanitizePublicCompetition` ➔ `comp.config?.scoring` (leitura direta sem autoridade de snapshot)

#### Depois da Fase 5.2:
- `OverallStandingsEngine` ➔ `ScoringEngine.calculatePoints(canonical, scoringConfig)` ➔ delega internamente cada lado para `ScoringEngine.calculateTeamPoints`
- `CompetitionRulesService.calculateCompetitionPoints` ➔ `CompetitionRulesService.getConfig(comp)` ➔ `ScoringEngine.calculateTeamPoints(w, l, wo, config.scoring)`
- `CompetitionRulesService.calculateMatchPoints` ➔ `CompetitionRulesService.getConfig(comp)` ➔ `ScoringEngine.calculatePoints(canonical, config.scoring)`
- `StandingsService.competitionPointsFromSets` ➔ `CompetitionRulesService.calculateCompetitionPoints(comp, w, l, wo)` (preservado como adapter legítimo)
- `sanitizePublicCompetition` ➔ `CompetitionRulesService.getConfig(comp).scoring` (alinhado com SSOT)

---

### 5. ALTERAÇÕES REALIZADAS POR ARQUIVO

#### 1. `src/services/scoringEngine.ts`
- **Adição do método puro `calculateTeamPoints(setsWon, setsLost, isWo, scoringConfig): number`:**
  - Implementa a guarda defensiva contra estados incompletos (`setsWon === setsLost -> 0`).
  - Resolve pontuação de W.O. (`pointsWoWin` / `pointsWoLoss`).
  - Corrige a avaliação de vitória/derrota apertada com a checagem de sets do oponente (`isNarrow = diff === 1 && setsLost > 0` para vitória; `diff === 1 && setsWon > 0` para derrota).
- **Refatoração de `calculatePoints(canonical, scoringConfig): MatchPointsResult`:**
  - Delega o cálculo de pontos do time A e do time B diretamente a `this.calculateTeamPoints`.
  - Zero replicação de regras aritméticas dentro da classe.

#### 2. `src/services/competitionRulesService.ts`
- **Importação de `ScoringEngine` e `MatchPointsResult`:**
- **Refatoração de `calculateCompetitionPoints`:**
  - Obtém a configuração canônica oficial da competição via `this.getConfig(competition)`.
  - Delega o cálculo a `ScoringEngine.calculateTeamPoints(setsWon, setsLost, isWo, config.scoring)`.
- **Adição do método de conveniência normativa `calculateMatchPoints(competition, canonical)`:**
  - Fachada canônica para quando se tem o `CompetitionRecord` e o `CanonicalMatchResult`.

#### 3. `src/services/publicCompetitionService.ts`
- **Atualização em `sanitizePublicCompetition`:**
  - Substituída a leitura direta `const cfg = comp.config || ...` por `const cfg = CompetitionRulesService.getConfig(comp);`.
  - Garante que a projeção pública reflita exatamente as regras ativas ou o snapshot congelado.

#### 4. `src/test/scoringEngineUnification.test.ts`
- **Criação da suíte canônica de testes de autoridade com 14 especificações:**
  - Teste de prova de autoridade (divergência proposital entre config amador e padrão).
  - Teste da configuração padrão indoor (lida dinamicamente do config, sem premissas hardcoded).
  - Testes específicos do formato de 1 set (1x0 limpo 3x0, 0x1 limpo 0x3, tabela de classificação oficial).
  - Teste do snapshot congelado (`rulesSnapshot`).
  - Teste de regras customizadas com pontuações arbitrárias válidas do regulamento.
  - Teste de W.O. (walkover) individual e canônico.
  - Teste de fallback defensivo e guarda de estados incompletos.
  - Teste de vôlei de praia (`modality = 'beach'`).
  - Teste de equivalência estrita de resultados entre `CompetitionRulesService` e `ScoringEngine`.

---

### 6. CORREÇÃO DO FORMATO DE 1 SET

#### O Problema:
Nos formatos de set único (`setsToWin = 1`, `maxSets = 1`), frequentes em torneios rápidos ou festivais, a pontuação final da partida em sets é `1x0` (ou `0x1`).
O código anterior avaliava vitória apertada via:
```typescript
const isNarrow = (setsWon - setsLost) === 1; // 1 - 0 === 1 => TRUE!
```
Isso fazia com que:
- Vencedor de 1x0 ganhasse `2 pontos` (como se fosse tiebreak de 3x2 ou 2x1);
- Perdedor de 1x0 ganhasse `1 ponto` (como se tivesse ido ao tiebreak e perdido por 2x3 ou 1x2).

Isso era um bug silencioso de domínio esportivo: em uma partida de 1 set, o perdedor não fez nenhum set (`setsLost === 0` para o vencedor) e não tem direito a ponto algum de bonificação.

#### A Solução:
```typescript
// Vitória apertada / tiebreak exige que o adversário tenha vencido ao menos 1 set
const isNarrow = (setsWon - setsLost === 1) && setsLost > 0;

// Derrota apertada / tiebreak exige que a equipe tenha vencido ao menos 1 set
const isNarrow = (setsLost - setsWon === 1) && setsWon > 0;
```
Com isso:
- `1x0`: `setsWon = 1`, `setsLost = 0` ➔ `setsLost > 0` é `false` ➔ Vitória Limpa: **3 pontos** para o vencedor, **0 pontos** para o derrotado.
- `3x2`: `setsWon = 3`, `setsLost = 2` ➔ `setsLost > 0` é `true` ➔ Vitória Apertada: **2 pontos** para o vencedor, **1 ponto** para o derrotado.
- `3x0` ou `3x1`: `setsWon - setsLost > 1` ➔ Vitória Limpa: **3 pontos** para o vencedor, **0 pontos** para o derrotado.

---

### 7. COBERTURA DE TESTES

A suíte `src/test/scoringEngineUnification.test.ts` cobriu integralmente todos os cenários exigidos:

```
 ✓ src/test/scoringEngineUnification.test.ts (14 tests) 34ms
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 1. Teste de Prova da Autoridade (Divergência Proposital) > prova que a classificação computa a regra canônica configurada na competição e não o padrão externo (11ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 2. Configuração Padrão Indoor do BaseOS > atribui pontuação correta lida dinamicamente da configuração padrão indoor em 5 sets (1ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 2. Configuração Padrão Indoor do BaseOS > atribui pontuação correta lida dinamicamente da configuração padrão indoor em 3 sets (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 3. Teste Explícito do Formato de 1 Set (setsToWin = 1, maxSets = 1) > em 1x0, aplica vitória limpa (pointsWinClear) e NÃO pode aplicar vitória apertada (pointsWinNarrow) (1ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 3. Teste Explícito do Formato de 1 Set (setsToWin = 1, maxSets = 1) > em 0x1, aplica derrota limpa (pointsLossClear) e NÃO pode aplicar derrota apertada (pointsLossNarrow) (1ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 3. Teste Explícito do Formato de 1 Set (setsToWin = 1, maxSets = 1) > computa a classificação oficial de partida de 1 set sem conceder ponto indevido ao derrotado (7ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 4. Circuito Blindado de rulesSnapshot > comprova que o cálculo utiliza a pontuação do snapshot congelado e não o config mutado (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 5. Regra Customizada do Regulamento > aplica pontuação com valores customizados arbitrários suportados pelo ScoringSystemConfig (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 6. Regra de W.O. (Walkover) > atribui pointsWoWin ao vencedor e pointsWoLoss ao perdedor de W.O. (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 6. Regra de W.O. (Walkover) > ScoringEngine atribui pointsWoWin e pointsWoLoss em CanonicalMatchResult com isWo (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 7. Fallback Defensivo e Guarda de Estados Incompletos > competitionPointsFromSets sem competition aplica fallback normalizado para indoor (1ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 7. Fallback Defensivo e Guarda de Estados Incompletos > setsWon === setsLost representa estado incompleto ou inválido e retorna 0 defensivamente (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 8. Vôlei de Praia (modality = beach) > propaga contexto de praia e calcula pontuação normalmente (0ms)
   ✓ Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação > 9. Teste de Equivalência de Resultado entre APIs > produz resultado idêntico entre CompetitionRulesService e ScoringEngine para todos os cenários (9ms)
```

---

### 8. VALIDAÇÃO QUÁDRUPLA

Os quatro comandos oficiais do BaseOS foram executados com sucesso absoluto:

#### 1. Verificação de Tipos TypeScript:
```bash
npx tsc -p tsconfig.app.json --noEmit
# Código de saída: 0 (0 erros de tipagem)
```

#### 2. ESLint:
```bash
npm run lint
# Código de saída: 0 (0 erros, 1 warning pré-existente de dependência em DrawArenaCanvas.tsx)
```

#### 3. Suíte Global Vitest:
```bash
npm test -- --run
# Test Files: 101 passed (101)
# Tests:      898 passed (898)
# Status:     100% PASS
```

#### 4. Build de Produção Vite:
```bash
npm run build
# vite v5.4.21 building for production...
# ✓ 4140 modules transformed.
# ✓ built in 1m 2s
# Código de saída: 0
```

---

### 9. PRESERVAÇÃO ARQUITETURAL

Durante toda a execução da Fase 5.2, foram observadas as seguintes garantias de isolamento:

1. **Document Engine Intocado:** A árvore inteira em `src/document-engine/baseos/` permaneceu estritamente intocada (zero linhas modificadas).
2. **Súmula Canônica e Ordem de Saque Canônica:** 100% preservadas em sua geometria, layout A4, renderização `@react-pdf/renderer` e geração vetorial.
3. **Frontend Visual Intocado:** Nenhuma alteração em componentes de UI, páginas ou formulários visuais.
4. **Adapter Preservado:** `competitionPointsFromSets` não foi eliminado nem quebrou retrocompatibilidade com callers existentes; foi reancorado na fachada normativa.

---

### 10. CERTIFICAÇÃO DE HOMOLOGAÇÃO DA FASE 5.2

A autoridade normativa de cálculo de pontos da classificação está plenamente unificada, o bug do formato de 1 set está permanentemente extinto e protegido por testes de regressão, e todo o ecossistema do BaseOS opera em conformidade rigorosa com a arquitetura canônica.

**FASE 5.2 — HOMOLOGADA E CONCLUÍDA COM SUCESSO 🟢**
