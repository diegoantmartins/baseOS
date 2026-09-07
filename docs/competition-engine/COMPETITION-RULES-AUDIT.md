# BASEOS — AUDITORIA DE REGRAS ESPORTIVAS, PONTUAÇÃO, CLASSIFICAÇÃO, DESEMPATE, SETS E W.O.

**Documento Técnico:** `docs/competition-engine/COMPETITION-RULES-AUDIT.md`  
**Fase:** 4.1 (Auditoria Somente Leitura)  
**Status:** **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

---

## 1. SISTEMA DE PONTUAÇÃO NA TABELA DE CLASSIFICAÇÃO

### 1.1. Onde está definido e implementado
O sistema de pontuação é governado por:
- `src/types/competitionConfig.ts:72-87` (`ScoringSystemConfig`):
  ```ts
  export interface ScoringSystemConfig {
    systemType: 'fivb-standard' | 'simple' | 'win-loss' | 'custom';
    pointsWinClear: number;   // 3 (3x0, 3x1 em melhor de 5; 2x0 em melhor de 3)
    pointsWinNarrow: number;  // 2 (3x2 em melhor de 5; 2x1 em melhor de 3)
    pointsLossNarrow: number; // 1 (2x3 em melhor de 5; 1x2 em melhor de 3)
    pointsLossClear: number;  // 0 (0x3, 1x3 em melhor de 5; 0x2 em melhor de 3)
    pointsWoWin: number;      // 3
    pointsWoLoss: number;     // 0
  }
  ```
- `src/services/competitionRulesService.ts:170-204` (`calculateCompetitionPoints`):
  A função recebe `(competition, setsWon, setsLost, isWo)`. Se `setsWon > setsLost`:
  - Se a diferença for de 1 set (`diff === 1`), concede `scoring.pointsWinNarrow` (2 pts).
  - Se a diferença for $\ge 2$ sets, concede `scoring.pointsWinClear` (3 pts).
  Se `setsLost > setsWon`:
  - Se a diferença for de 1 set (`diff === 1`), concede `scoring.pointsLossNarrow` (1 pt).
  - Se a diferença for $\ge 2$ sets, concede `scoring.pointsLossClear` (0 pts).

### 1.2. Avaliação de Configurabilidade
- **Configurabilidade no Objeto:** Os valores numéricos de vitória clara, vitória apertada, derrota apertada, derrota clara e W.O. estão no contrato `CompetitionConfig.scoring`.
- **Configurabilidade na UI:** **PARCIAL / BLOQUEADA NA INTERFACE**.
  - O diálogo de criação (`CompetitionFormDialog.tsx`) e o diálogo de edição (`CompetitionSettingsEditDialog.tsx`) **não expõem campos para editar os pontos de vitória/derrota**. Eles assumem incondicionalmente o preset `fivb-standard` (3, 2, 1, 0, 3, 0).
- **Variação por Fase:** O contrato atual `CompetitionConfig.scoring` é global por competição. Não há como configurar pontuação diferente entre fases distintas.

---

## 2. MOTOR DE CLASSIFICAÇÃO E ESTATÍSTICAS

### 2.1. Indicadores Calculados
Em `src/services/standingsService.ts:93-148` (`accumulateStats`), todos os indicadores oficiais de voleibol são calculados a partir do Resultado Canônico (`CanonicalMatchResult`):

1. **`matchesPlayed`:** Partidas concluídas ou homologadas.
2. **`matchesWon`:** Partidas em que a equipe foi o `canonical.winnerId`.
3. **`matchesLost`:** Partidas em que a equipe foi o `canonical.loserId`.
4. **`setsWon`:** Total de sets vencidos.
5. **`setsLost`:** Total de sets perdidos.
6. **`setsBalance`:** Saldo simples ($\text{setsWon} - \text{setsLost}$).
7. **`setsRatio` (Set Average):** Quociente oficial $\text{setsWon} / \text{setsLost}$. Se `setsLost === 0`, o sistema atribui `setsWon` como razão para evitar divisão por zero (`standingsService.ts:144`).
8. **`pointsWon`:** Total de pontos marcados nos sets.
9. **`pointsLost`:** Total de pontos sofridos nos sets.
10. **`pointsBalance`:** Saldo simples ($\text{pointsWon} - \text{pointsLost}$).
11. **`pointsRatio` (Pontos Average):** Quociente oficial $\text{pointsWon} / \text{pointsLost}$. Se `pointsLost === 0`, o sistema atribui `pointsWon` (`standingsService.ts:145`).
12. **`competitionPoints`:** Pontos atribuídos na tabela de acordo com `calculateCompetitionPoints`.
13. **`isProvisional`:** Flag booleana que indica se há jogos concluídos porém ainda não homologados.
14. **`tiebreakReason`:** Texto explicativo gerado automaticamente informando qual critério desempatou a equipe em relação ao adversário direto.

### 2.2. Consumo dos Indicadores
- **StandingsTable (`src/components/competition/StandingsTable.tsx`):** Exibe as colunas com tipografia tabular mono, destacando pontos, vitórias, sets e pontos average.
- **Portal Público (`PublicCompetitionPage.tsx` e `publicCompetitionService.ts`):** Consome diretamente a projeção canônica do `standingsService`.
- **Relatórios PDF (`reportsPdf.ts`):** Renderiza o boletim oficial de classificação.

---

## 3. MOTOR DE DESEMPATES E ORDENAÇÃO

### 3.1. Critérios Suportados
O enum `TiebreakCriterionId` (`src/types/entities.ts:22-32`) e o avaliador `evaluateSingleCriterion` (`standingsService.ts:177-261`) suportam:
1. `'points'`: Maior pontuação na tabela.
2. `'victories'`: Maior número de vitórias.
3. `'head-to-head'`: Confronto direto.
4. `'set-average'` / `'sets-ratio'`: Quociente de sets.
5. `'points-average'` / `'points-ratio'`: Quociente de pontos.
6. `'sets-balance'`: Saldo de sets.
7. `'points-balance'`: Saldo de pontos.
8. `'draw'`: Sorteio determinístico estável via `teamId.localeCompare`.

### 3.2. Ordem dos Critérios: Configurável?
- **SIM, NO CONTRATO:** O array `tiebreakCriteriaOrder` pode receber qualquer combinação e ordenação dos critérios acima (ex: colocar vitórias antes de pontos, ou saldo de sets antes de set average).
- **PADRÃO ATUAL:** `['points', 'head-to-head', 'set-average', 'points-average', 'sets-balance', 'points-balance', 'victories', 'draw']` (`DEFAULT_TIEBREAK_CRITERIA` em `standingsService.ts:45-54`).

### 3.3. Limitação Crítica do Confronto Direto (`head-to-head`)
Em `standingsService.ts:151-171`:
```ts
export function headToHeadWinner(matches, teamAId, teamBId, onlyHomologated)
```
- **Problema 1 (Restrição Binária):** A função avalia estritamente 2 equipes. Se 3 ou mais equipes empatarem em pontos e vitórias, o algoritmo não constrói a mini-tabela entre as equipes empatadas.
- **Problema 2 (Violação de Transitividade no `Array.sort`):** Em um empate triplo circular (A venceu B, B venceu C, C venceu A), o comparador pairwise retorna:
  - $A > B$ (diff = -1)
  - $B > C$ (diff = -1)
  - $C > A$ (diff = -1)
  Isso quebra a transitividade matemática exigida pelo algoritmo de ordenação do JavaScript (Timsort), gerando posições arbitrárias e instáveis dependendo da ordem inicial do array.
- **Regulamento Oficial FIVB/CBV vs Código:** O regulamento oficial determina que no caso de empate entre 3 ou mais equipes, o confronto direto não é aplicado inicialmente; utilizam-se primeiro o set average e o pontos average entre TODOS os jogos do grupo. Se ainda assim persistir o empate entre 3 equipes, gera-se uma classificação isolada considerando exclusivamente as partidas disputadas entre as equipes empatadas. O BaseOS **não possui esse motor de sub-classificação / mini-tabela**.

---

## 4. MOTOR DE SETS E FORMATO DE SET

### 4.1. Melhor de 3 vs Melhor de 5
- O tipo canônico `SetsToWin = 1 | 2 | 3` (`src/types/competitionConfig.ts:15`) modela:
  - `1`: Set único.
  - `2`: Melhor de 3 (vence quem fizer 2 sets).
  - `3`: Melhor de 5 (vence quem fizer 3 sets).
- A derivação de sets máximos é puramente determinística: $\text{maxSets} = (\text{setsToWin} \times 2) - 1$ (`deriveMaxSets`).

### 4.2. Pontuação por Set e Vantagem
Em `CompetitionRulesService.validateSingleSet` (`competitionRulesService.ts:209-251`):
- `regularSetPoints`: Pontuação alvo regular (padrão: 25 na quadra, 21 na praia).
- `tiebreakPoints`: Pontuação do set desempate (padrão: 15).
- `minAdvantage`: Vantagem mínima obrigatória (padrão: 2).
- **Sem Teto Máximo:** O código permite que o placar continue indefinidamente além do alvo enquanto a diferença for inferior a `minAdvantage`, exigindo que ao ultrapassar o alvo a diferença seja exatamente igual a `minAdvantage` (ex: 26x24, 27x25, 31x29).
- **Validação de Partida Completa (`validateMatchScore`):** Impede o registro de sets adicionais após uma equipe já ter atingido `setsToWin` e valida se a partida foi devidamente concluída.

---

## 5. AUDITORIA DE W.O. (WALK-OVER)

### 5.1. Registro e Tratamento no Código
- Em `MatchRecord`, o W.O. é marcado por `isWo: boolean`, `status: 'wo'`, `woReason: string` e `winnerId: string`.
- Em `CompetitionRulesService.getCanonicalMatchResult` (`competitionRulesService.ts:434-497`):
  - Exige a identificação da equipe vencedora.
  - Atribui automaticamente sets vencidos para o vencedor igual a `setsToWin` e 0 para o perdedor.
  - Atribui pontos marcados para o vencedor como $\text{requiredWins} \times \text{regularSetPoints}$ (ex: em melhor de 3 na quadra, $2 \times 25 = 50$ pontos a 0).
- Em `CompetitionRulesService.calculateCompetitionPoints` (`competitionRulesService.ts:179-181`):
  - Vencedor recebe `scoring.pointsWoWin` (padrão: 3 pts).
  - Perdedor recebe `scoring.pointsWoLoss` (padrão: 0 pts).

### 5.2. Limitações Críticas de W.O.
1. **Impacto Estatístico Artificial:** Ao atribuir $50 \times 0$ (ou $75 \times 0$ em melhor de 5) nos pontos do jogo de W.O., o saldo de pontos e o quociente de pontos da equipe vencedora sofrem uma distorção gigantesca, beneficiando-a excessivamente em critérios de desempate por pontos average.
2. **Sem Suporte a Desclassificação / Anulação de Jogos:** Regulamentos amadores e federações frequentemente determinam que W.O. injustificado acarreta a eliminação da equipe e a anulação de todos os seus resultados anteriores no grupo (como se a equipe não tivesse participado). O BaseOS **não possui suporte para anulação retroativa de partidas de equipe eliminada por W.O.**
3. **Inexistência de Regra Configurável de W.O. na Configuração:** Existe apenas uma coluna de texto livre `woRules text` no banco de dados e na entidade `CompetitionRecord`, que não é interpretada por nenhum serviço do sistema.

---

## 6. LIMITES DE ELENCO E INSCRIÇÃO

### 6.1. Fonte Única da Verdade (`RegistrationRulesConfig`)
Definido em `src/types/competitionConfig.ts:107-118`:
- `minAthletes`: Mínimo de atletas (padrão: 6 quadra, 2 praia).
- `maxAthletes`: Máximo de atletas (padrão: 14 quadra, 4 praia).
- `maxCaptains`: Máximo de capitães (padrão: 1).
- `maxLiberos`: Máximo de líberos (padrão: 2 quadra, 0 praia).
- `requireJerseyNumberOnRegistration`: Número de camisa obrigatório na inscrição prévia (padrão: `false`).

### 6.2. Integridade no Banco (RPC v2)
Na migration `20260905000004_rpc_register_athlete_v2.sql`, a função `register_athlete` lê dinamicamente `v_max_athletes` do JSON de configuração da competição (`config -> 'registration' ->> 'maxAthletes'`), eliminando hardcodes antigos em nível de banco de dados.

---

## 7. RESUMO DOS GAPS DE REGRAS ESPORTIVAS

1. **Pontuação não editável na UI:** Parâmetros de pontuação existem no tipo, mas estão inacessíveis para o organizador na interface gráfica.
2. **Empate Triplo no Confronto Direto Falho:** O algoritmo não possui motor de desempate multi-equipe (mini-tabela).
3. **Regulamento de W.O. Rígido:** Não permite regras personalizadas de W.O. (como placar neutro ou anulação de partidas da equipe desistente).
4. **Sem Regras Específicas por Fase:** Pontuação e critérios de desempate são estritamente globais e não podem variar entre fases.
