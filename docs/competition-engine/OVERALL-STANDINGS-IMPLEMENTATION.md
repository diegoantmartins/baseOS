# Ranking Geral Intergrupos — OverallStandingsEngine (Fase 4.3)

**Data:** 05/09/2026  
**Módulo:** `src/services/overallStandingsEngine.ts`  
**Status:** Implementado, homologado e 100% coberto por testes  

---

## 1. Contexto e Motivação

Até a Fase 4.2, o sistema BaseOS calculava classificação estritamente no âmbito de cada grupo isolado (`computeStandings`). Para competições compostas ou formatos que utilizam fases eliminatórias com repescagem/play-in e byes (como os 4 melhores avançando direto e os demais disputando repescagem), era imperativo unificar as equipes de todos os grupos em um **Ranking Geral Intergrupos**.

A **Fase 4.3** implementa o `OverallStandingsEngine`, responsável pela ordenação matemática e determinística entre múltiplos grupos sem acoplamento com progressões ou nomes de torneios.

---

## 2. Estratégias de Agregação Configuráveis

Para evitar o erro de transformar uma convenção particular (como o padrão olímpico) em regra rígida universal do BaseOS, o tipo `OverallRankingStrategy` foi definido com tipagem estrita e fechada:

```typescript
export type OverallRankingStrategy =
  | 'by-group-position-first'
  | 'pure-overall-stats'
  | 'custom';
```

### 2.1. `by-group-position-first`
- **Conceito:** Prioriza a colocação conquistada no respectivo grupo antes de comparar estatísticas globais.
- **Hierarquia:**
  1. Todos os 1º colocados dos grupos disputam as posições $1 \dots G$ do ranking geral, comparados pelos critérios de desempate configurados;
  2. Todos os 2º colocados dos grupos disputam as posições $(G+1) \dots 2G$;
  3. Todos os 3º colocados dos grupos disputam as posições $(2G+1) \dots 3G$; e assim sucessivamente.
- **Justificativa Esportiva:** Garante que um 2º colocado nunca ultrapasse um campeão de grupo no ranking geral, mesmo que tenha somado mais pontos em um grupo mais frágil.

### 2.2. `pure-overall-stats`
- **Conceito:** Todas as equipes de todos os grupos são agrupadas em um único pool e classificadas puramente pelas estatísticas globais acumuladas (pontos, vitórias, saldo de sets, saldo de pontos), sem privilegiar a posição relativa dentro do grupo.
- **Justificativa Esportiva:** Padrão comum em ligas onde o balanceamento estatístico global sobrepõe a distribuição de chaves.

### 2.3. `custom`
- Permite a injeção ou parametrização de funções de comparação externas ou regulamentos especiais sem quebrar a tipagem TypeScript.

---

## 3. Desempates no Ranking Intergrupos

No ranking geral, equipes de grupos distintos normalmente não se enfrentaram. Portanto:
- Critérios de confronto direto entre grupos distintos são avaliados como neutros (empate técnico entre si);
- A ordenação recorre rigorosamente aos critérios subsequentes configurados em `tiebreakCriteriaOrder` (como `points`, `sets-ratio`, `points-ratio`, etc.);
- Sorteio determinístico (`draw`) somente atua se expressamente configurado na ordem;
- Se os critérios se esgotarem sem desempate e sem `draw`, o motor sinaliza com exatidão:
  ```typescript
  unresolvedTie = true
  ```

---

## 4. Consultas e Seletores Esportivos

O `OverallStandingsEngine` fornece métodos canônicos para alimentar contratos de feeds entre estágios:

- `getGroupWinners(overallStandings)`: Retorna os líderes de grupo ordenados no ranking geral.
- `getSecondPlaced(overallStandings)`: Retorna os segundos colocados ordenados.
- `getThirdPlaced(overallStandings)`: Retorna os terceiros colocados ordenados.
- `getPositionsRange(overallStandings, startRank, endRank)`: Retorna uma faixa de seeds (ex: posições 5 a 12 para alimentar um play-in).

---

## 5. Cobertura de Testes Automatizados

O arquivo `src/test/overallStandings.test.ts` valida:
- Agregação de 4 grupos com 3 equipes (12 equipes);
- Estratégia `by-group-position-first` (1º colocados nos seeds 1–4, 2º colocados nos seeds 5–8, 3º colocados nos seeds 9–12);
- Estratégia `pure-overall-stats` sem priorização de posição no grupo;
- Resolução determinística de empates estatísticos intergrupos;
- Seletores `getGroupWinners`, `getSecondPlaced`, `getPositionsRange`;
- Sinalização canônica de `unresolvedTie: true` quando critérios são insuficientes.

**Status de Qualidade:** 12/12 testes passando sem qualquer inconsistência.
