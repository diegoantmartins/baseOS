# BASEOS — FASE 4.6: CLASSIFICAÇÃO E ESTATÍSTICAS COMO PROJEÇÕES CANÔNICAS

## 1. Visão Geral e Objetivo

A Fase 4.6 consolidou o motor de classificação e o módulo de estatísticas como **projeções puramente determinísticas dos resultados canônicos**, garantindo que:
- Não exista nenhum cálculo paralelo ou concorrente de pontos, vitórias, sets e parciais no sistema.
- A classificação em todas as telas ([`StandingsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/StandingsPage.tsx), [`CompetitionsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/CompetitionsPage.tsx), [`MatchesPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/MatchesPage.tsx), [`ReportsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/ReportsPage.tsx)) e no motor de PDFs derive seus números de `standingsService.ts`.
- Os critérios de desempate ordenáveis sejam obtidos exclusivamente da configuração oficial da competição (`CompetitionConfig` ou `rulesSnapshot`).
- As estatísticas consolidadas de desempenho e rankings em [`StatisticsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/StatisticsPage.tsx) consumam `CompetitionRulesService.getCanonicalMatchResult`.

---

## 2. Diagnóstico da Auditoria e Decisões

### 2.1 Critérios Canônicos de Desempate
- **Problema**: As telas passavam a propriedade de nível superior `competition.tiebreakCriteriaOrder` (legada), sem consultar prioritariamente a configuração canônica (`competition.config.standings.tiebreakCriteriaOrder`) ou as regras congeladas (`rulesSnapshot`).
- **Solução**: `computeStandings` foi atualizado para consultar `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`, garantindo que regras de desempate customizadas pelo organizador sejam rigorosamente respeitadas e protegidas pelo snapshot.

### 2.2 Cálculos Paralelos em `StatisticsPage.tsx`
- **Problema**: O ranking de vitórias e pontos de equipes acumulava parciais diretamente de `m.sets.reduce(...)` e comparava `m.winnerId === m.teamAId`. Em partidas por W.O. sem parciais cadastradas no banco, os pontos eram perdidos na análise de estatísticas.
- **Solução**: Migrado para iterar via `CompetitionRulesService.getCanonicalMatchResult(comp, m)`, obtendo pontos pró/contra e vitórias oficiais de forma 100% resiliente e uniforme.

### 2.3 Tratamento de Médias e Divisão por Zero
- **Set Average (Sets Ratio)**: $\frac{\text{Sets Pró}}{\text{Sets Contra}}$. Quando Sets Contra for 0, o quociente é tratado como Sets Pró, garantindo que equipes invictas sem perder sets fiquem à frente de equipes que sofreram sets perdidos.
- **Points Average (Points Ratio)**: $\frac{\text{Pontos Pró}}{\text{Pontos Contra}}$. Tratamento análogo de divisor zero.
- **Precisão**: Desempate por média utiliza precisão de 4 casas decimais (`Math.abs(diff) > 0.0001`), formatado para exibição com 3 casas decimais (`.toFixed(3)`).

---

## 3. Arquivos Modificados e Criados

1. **[`src/services/standingsService.ts`](file:///home/diego-martins/docker/volei/src/services/standingsService.ts)**:
   - Extração automática da ordem canônica de critérios de desempate a partir de `CompetitionRulesService.getConfig(competition)`.
   - `accumulateStats` e `matchWinner` alimentados por `CanonicalMatchResult`.
2. **[`src/pages/StatisticsPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/StatisticsPage.tsx)**:
   - Rankings de vitórias e pontos derivados de `CompetitionRulesService.getCanonicalMatchResult`.
3. **[`src/test/canonicalStandings.test.ts`](file:///home/diego-martins/docker/volei/src/test/canonicalStandings.test.ts)**:
   - Nova suíte de testes de classificação cobrindo pontuação FIVB, desempate ordenado por configuração, médias com divisor zero e W.O.

---

## 4. Testes e Validação da Fase 4.6

- Suíte de classificação canônica: `src/test/canonicalStandings.test.ts` (4 testes aprovados).
- Suíte geral de testes: **67 arquivos de teste, 532 testes aprovados (100% verde)**.
- TypeScript: 0 erros (`tsc` limpo).
- ESLint: 0 erros.
- Build de Produção: Sucesso em 57.69s.
