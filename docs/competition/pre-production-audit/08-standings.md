# BaseOS — Auditoria de Classificação e Critérios de Desempate (Fase 4.PRE)

**Arquivo Auditado:** `src/services/standingsService.ts`, `src/services/tieBreakEngine.ts`, `src/services/overallStandingsEngine.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Algoritmo de Acumulação e Pontuação

A apuração da tabela de classificação (`standingsService.ts`) processa exclusivamente resultados canônicos:
- `matchesPlayed`, `matchesWon`, `matchesLost`
- `setsWon`, `setsLost`, `setsBalance`, `setsRatio`
- `pointsWon`, `pointsLost`, `pointsBalance`, `pointsRatio`
- `competitionPoints`: Calculado diretamente via `CompetitionRulesService.calculateCompetitionPoints(competition, setsWon, setsLost, isWo)`.

Nenhum cálculo de pontuação ou bônus de set reside hardcoded nos componentes visuais ou páginas.

---

## 2. Ordem Determinística dos Critérios de Desempate (`TieBreakEngine`)

O motor de desempate segue estritamente a ordem definida em `competition.config.standings.tiebreakCriteriaOrder` (padrão oficial FIVB / CBV):

1. **Maior número de pontos** (`points`)
2. **Maior número de vitórias** (`victories`)
3. **Confronto direto** (`head-to-head`): Aplicado entre duas equipes empatadas que tenham se enfrentado na fase.
4. **Set Average / Sets Ratio** (`set-average`): Razão $\text{setsWon} / \text{setsLost}$ (divisão por zero resolvida para o total de sets vencidos).
5. **Pontos Average / Points Ratio** (`points-average`): Razão $\text{pointsWon} / \text{pointsLost}$.
6. **Saldo de Sets** (`sets-balance`): $\text{setsWon} - \text{setsLost}$.
7. **Saldo de Pontos** (`points-balance`): $\text{pointsWon} - \text{pointsLost}$.
8. **Sorteio Determinístico** (`draw`): Desempate estável baseado em hash/seed previsível para evitar flutuações randômicas a cada recarregamento da tela.

---

## 3. Classificação Intergrupos e Ranking Geral Unificado (`OverallStandingsEngine`)

Para competições multi-estágio (como o formato VOLTZ):
- `OverallStandingsEngine.computeOverallStandings` agrega equipes de múltiplos grupos em uma tabela única de 1 a $N$.
- **Estratégia Padrão (`by-group-position-first`):**
  - Todos os 1ºs colocados de cada grupo disputam as posições 1 a $G$ com base nas campanhas;
  - Todos os 2ºs colocados disputam as posições $G+1$ a $2G$;
  - Garante justiça esportiva e mérito da colocação na chave original antes de métricas globais.
- Seletores declarativos (`getPositionsRange(standings, 1, 4)` e `getPositionsRange(standings, 5, 12)`) alimentam as vagas diretas e a repescagem (Play-In).
