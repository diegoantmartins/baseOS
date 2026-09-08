# BaseOS — Auditoria de Regras Esportivas, Sets e Pontuação (Fase 4.PRE)

**Arquivo Auditado:** `src/services/competitionRulesService.ts`, `src/services/matchValidationService.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Regras de Sets e Fechamento de Parciais

O motor canônico `CompetitionRulesService.validateSingleSet` valida a pontuação de cada set conforme as regras internacionais de voleibol (FIVB / CBV):

- **Set Regular:**
  - Quadra: 25 pontos com vantagem mínima de 2 pontos (ex: 25x23, 26x24, 28x26).
  - Praia: 21 pontos com vantagem mínima de 2 pontos (ex: 21x19, 22x20, 25x23).
  - Placar 24x24 (quadra) ou 20x20 (praia) exige continuidade do set até que uma equipe abra 2 pontos de diferença.
- **Set Desempate (Tiebreak):**
  - Quadra e Praia: 15 pontos com vantagem mínima de 2 pontos (ex: 15x13, 16x14, 18x16).
- **Incompletude e Excesso:**
  - Sets encerrados abaixo do teto de pontos (ex: 24x22 na quadra ou 20x18 na praia) são rejeitados como incompletos.
  - Sets onde o vencedor marcou acima do teto sem necessidade (ex: 26x20) são rejeitados como matematicamente inconsistentes.

---

## 2. Resolução Dinâmica de Formato por Fase (`resolveMatchFormat`)

A função `CompetitionRulesService.resolveMatchFormat(competition, phase, customSetFormat)` resolve o formato com a seguinte hierarquia estrita:

1. **Sobrescrita por Partida (`customSetFormat`):** Se a partida específica possuir formato customizado (ex: '1-set' para jogo de desempate), tem precedência absoluta.
2. **Sobrescrita por Fase (`phaseOverrides`):** Se a competição possuir regras específicas para a fase da partida:
   - `final` / `finais` -> `overrides.final`
   - `semifinal` / `semifinais` / `semifinals` -> `overrides.semifinals`
   - `quartas` / `quarterfinals` / `playoffs` -> `overrides.quarterfinals ?? overrides.playoffs`
   - `group-stage` / `groupstage` / `groups` / `classificatória` -> `overrides.groupStage`
3. **Padrão Geral da Competição (`defaultSetsToWin`):** Caso a fase não tenha override, aplica `config.format.defaultSetsToWin`.

---

## 3. Sistema de Pontuação na Tabela (`calculateCompetitionPoints`)

A pontuação na tabela é calculada estritamente por `CompetitionRulesService.calculateCompetitionPoints`:

### Modelo Oficial FIVB / CBV (`fivb-standard`)
- Vitória por 3x0 ou 3x1 (Vitória Clara): 3 pontos
- Vitória por 3x2 ou 2x1 (Vitória Apertada): 2 pontos
- Derrota por 2x3 ou 1x2 (Derrota Apertada): 1 ponto
- Derrota por 0x3 ou 1x3 (Derrota Clara): 0 pontos
- Vitória por W.O. (25x0, 25x0): 3 pontos
- Derrota por W.O.: 0 pontos

### Modelo Simples (`simple`)
- Vitória: 2 pontos
- Derrota: 1 ponto
- Derrota por W.O.: 0 pontos

### Modelo Vitória / Derrota (`win-loss`)
- Vitória: 1 ponto
- Derrota: 0 pontos
