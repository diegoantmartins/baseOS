# BASEOS — ARQUITETURA DE CLASSIFICAÇÃO, RANKING INTERGRUPOS E DESEMPATES MULTI-EQUIPE

**Data:** 05/09/2026  
**Documento:** Especificação Técnica Conceitual do Motor de Classificação e Desempate do BaseOS  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Ranking unificado intergrupos, algoritmo matemático rigoroso para desempate de 3+ equipes (Mini-Tabela / H2H Multi-Equipe) e preservação dos cálculos canônicos de voleibol (Set Ratio e Point Ratio).

---

## 1. VISÃO GERAL E DIAGNÓSTICO DO PROBLEMA ATUAL

A auditoria da Fase 4.1 apontou duas deficiências críticas na apuração de classificação do BaseOS:

### 1.1 Inexistência de Ranking Geral / Intergrupos
O BaseOS atual calcula apenas a classificação interna de cada grupo isoladamente (`groupStandings[groupIndex]`).
- Não existe uma função canônica que reúna todas as equipes de diferentes grupos em uma tabela geral unificada.
- Torneios que dependem de ranking unificado para definir confrontos — como o **Campeonato Voltz** (onde 1º a 4º vão para Quartas e 5º a 12º vão para Repescagem com cruzamentos $5 \times 12, 6 \times 11, 7 \times 10, 8 \times 9$) — são impossíveis de serem apurados pelo motor atual.

### 1.2 Violação de Transitividade em Empates com 3 ou mais Equipes (H2H)
Em `standingsService.ts`, a ordenação de equipes é feita através de `teams.sort((a, b) => ...)` chamando a função de confronto direto `headToHeadWinner(a.teamId, b.teamId, matches)`:
```typescript
// CÓDIGO ATUAL EM standingsService.ts (FRÁGIL)
if (criteria === 'head_to_head') {
  const h2h = headToHeadWinner(a.teamId, b.teamId, matches);
  if (h2h === a.teamId) return -1;
  if (h2h === b.teamId) return 1;
}
```
**O Erro Matemático:**
Se a Equipe A vence B ($A > B$), B vence C ($B > C$) e C vence A ($C > A$), a relação de ordem não é transitiva. A função de ordenação `sort()` do JavaScript torna-se indeterminística, e o resultado final da classificação depende da ordem inicial do array no banco de dados. Regulamentos oficiais (FIVB, CBV, CEV) exigem a construção de uma **Mini-Tabela** exclusiva entre as equipes envolvidas no empate.

---

## 2. ARQUITETURA DO RANKING GERAL INTERGRUPOS (`computeOverallStandings`)

O novo motor introduz a função matemática `computeOverallStandings`, responsável por consolidar e normalizar classificações de múltiplos grupos:

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Grupo A (1º..3º)│  │ Grupo B (1º..3º)│  │ Grupo C (1º..3º)│
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                 computeOverallStandings()
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
   Ranking Geral                           Subconjuntos Filtrados
 (1º ao 12º Unificado)                   - Apenas 1ºs Colocados (Top 4)
                                         - Apenas 2ºs Colocados
                                         - Restante para Repescagem (5º ao 12º)
                                         - Melhores 3ºs Colocados
```

### 2.1 Contrato da Função

```typescript
export interface OverallStandingsOptions {
  /** Critérios de ordenação global a serem aplicados */
  criteriaOrder?: TieBreakCriterion[];

  /**
   * Método de agregação intergrupos:
   * - 'by-group-position-first': Compara primeiro os 1ºs lugares entre si (1..G), 
   *    depois os 2ºs lugares, etc. (Padrão olímpico e Voltz).
   * - 'pure-overall-stats': Junta todas as equipes numa tabela única baseada puramente 
   *    em pontos, vitórias, set ratio, etc.
   */
  aggregationMethod: 'by-group-position-first' | 'pure-overall-stats';

  /** Normalização quando grupos possuem quantidades desiguais de equipes */
  groupSizeNormalization?: 'raw' | 'exclude-last-place-matches' | 'average-per-match';
}

export function computeOverallStandings(
  groupStandings: GroupStandings[],
  options: OverallStandingsOptions
): OverallStandingsResult;
```

### 2.2 Agregação Padrão Olímpico (`by-group-position-first`)
Para campeonatos onde cada grupo possui 3 equipes (ex: Voltz):
1. **Posições 1 a 4:** Ocupadas exclusivamente pelos 1ºs colocados de cada grupo (A1, B1, C1, D1), ordenados entre si pelos critérios de desempate (pontos, vitórias, set ratio, ponto ratio).
2. **Posições 5 a 8:** Ocupadas exclusivamente pelos 2ºs colocados (A2, B2, C2, D2), ordenados entre si.
3. **Posições 9 a 12:** Ocupadas pelos 3ºs colocados (A3, B3, C3, D3), ordenados entre si.

Essa abordagem preserva o mérito esportivo da fase de grupos: um 2º colocado nunca ultrapassa um 1º colocado no ranking geral, mesmo que tenha somado mais pontos em seu respectivo grupo.

---

## 3. O MOTOR DE DESEMPATE MULTI-EQUIPE (TIE-BREAK ENGINE)

Para resolver rigorosamente empates entre 2, 3 ou mais equipes, o `TieBreakEngine` substitui a comparação binária ad-hoc por um **algoritmo recursivo de resolução de partições**.

### 3.1 Algoritmo da Mini-Tabela (Regulamentos FIVB / CBV)

Dado um conjunto de equipes $T = \{t_1, t_2, \dots, t_k\}$ empatadas em um critério primário (ex: Pontos e Vitórias):

```text
              Empate Detectado entre k equipes
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
               k === 2               k >= 3
                  │                     │
          Confronto Direto      Extrair MINI-TABELA
             Tradicional      (Apenas partidas entre as
                                 k equipes empatadas)
                                        │
                                        ▼
                             Calcular Estatísticas
                                na Mini-Tabela:
                             - Pontos na Mini-Tabela
                             - Vitórias na Mini-Tabela
                             - Set Ratio na Mini-Tabela
                             - Point Ratio na Mini-Tabela
                                        │
                                        ▼
                              Ocorreu Desempate?
                             ┌──────────┴──────────┐
                             ▼                     ▼
                           SIM                    NÃO
                             │                     │
                   Alguma equipe se isolou?    Permanecem empatadas
                   - Se restarem 2: H2H direto  na Mini-Tabela?
                   - Se restarem 3+: Nova Mini  Recorrer aos Critérios
                     recursiva                  Gerais (Global Set Ratio,
                                                Global Point Ratio, Sorteio)
```

### 3.2 Formalização Matemática

1. **Definição de Partida Interna:**
   Seja $M(T)$ o subconjunto de partidas finalizadas onde tanto a equipe mandante quanto a visitante pertencem ao grupo empatado:
   $$M(T) = \{ m \in Matches \mid m.homeTeamId \in T \wedge m.awayTeamId \in T \}$$

2. **Mini-Estatísticas:**
   Para cada $t \in T$, calculam-se as estatísticas acumuladas restritas a $M(T)$:
   $$\text{Points}_{mini}(t), \quad \text{Wins}_{mini}(t), \quad \text{SetRatio}_{mini}(t) = \frac{\sum SetsWon_{mini}}{\sum SetsLost_{mini}}, \quad \text{PointRatio}_{mini}(t) = \frac{\sum PtsWon_{mini}}{\sum PtsLost_{mini}}$$

3. **Resolução de Empates Parciais:**
   Se após aplicar a mini-tabela, uma equipe $t_x$ obtiver o melhor índice e se isolar, ela assume a posição superior. Se as outras $k-1$ equipes continuarem empatadas:
   - Se restarem 2 equipes: aplica-se o confronto direto entre elas.
   - Se restarem 3+ equipes: reavalia-se a mini-tabela apenas entre as equipes remanescentes.

4. **Desempate Circular Irredutível:**
   Se na mini-tabela todas as 3 equipes venceram 1 jogo por 2×1 com parciais idênticas, o confronto direto é declarado **irresolvível**. O motor avança automaticamente para os critérios globais:
   1. Set Ratio na fase inteira;
   2. Point Ratio na fase inteira;
   3. Sorteio determinístico (`deterministicDrawSeed` / PRNG auditável).

---

## 4. PRESERVAÇÃO DAS MÉTRICAS CANÔNICAS DE VOLEIBOL

O voleibol possui regras estatísticas particulares que são preservadas na nova arquitetura:

### 4.1 Set Ratio (Razão de Sets)
$$\text{Set Ratio} = \frac{\text{Sets Vencidos}}{\text{Sets Perdidos}}$$
- **Caso Especial de Divisão por Zero:** Se uma equipe não perdeu nenhum set ($\text{Sets Perdidos} = 0$), o sistema atribui o valor formal `Infinity` (ou $MAX\_VALUE$). Entre duas equipes invictas em sets, empata-se no set ratio e desempata-se no Point Ratio.

### 4.2 Point Ratio (Razão de Pontos)
$$\text{Point Ratio} = \frac{\text{Pontos Pró}}{\text{Pontos Contra}}$$
- Também utiliza quociente matemático (arredondado a 4 casas decimais para fins de exibição, mas comparado com precisão total de ponto flutuante).

### 4.3 Diferença de Sets / Saldo de Pontos
Em alguns campeonatos amadores municipais, utiliza-se a diferença absoluta ($\text{Sets Vencidos} - \text{Sets Perdidos}$) em vez do quociente. O motor suporta ambos como critérios configuráveis independentes:
- `set_ratio` (Quociente oficial FIVB)
- `set_differential` (Saldo de sets simples)
- `point_ratio` (Quociente oficial FIVB)
- `point_differential` (Saldo de pontos simples)

---

## 5. CONFIGURABILIDADE DA ORDEM DE CRITÉRIOS DE DESEMPATE

No `CompetitionConfigV2`, a ordenação dos critérios é 100% declarativa:

```typescript
export type TieBreakCriterion =
  | 'points'
  | 'wins'
  | 'head_to_head'
  | 'set_ratio'
  | 'set_differential'
  | 'point_ratio'
  | 'point_differential'
  | 'head_to_head_mini_table'
  | 'deterministic_draw';

// Exemplo de configuração padrão FIVB / CBV
export const FIVB_TIE_BREAK_ORDER: TieBreakCriterion[] = [
  'points',
  'wins',
  'set_ratio',
  'point_ratio',
  'head_to_head',
  'deterministic_draw'
];

// Exemplo de configuração com Confronto Direto Prioritário (Muito comum no amador)
export const AMATEUR_H2H_FIRST_TIE_BREAK_ORDER: TieBreakCriterion[] = [
  'points',
  'wins',
  'head_to_head_mini_table',
  'set_ratio',
  'point_ratio',
  'deterministic_draw'
];
```

Essa separação garante que nenhum regulamento precise alterar o código fonte do sistema para adotar a ordem de desempate preferida pela sua federação ou comissão organizadora.
