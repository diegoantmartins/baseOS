# BASEOS — MATRIZ DE COMPATIBILIDADE DE FORMATOS

**Data:** 05/09/2026  
**Documento:** Matriz de Comparação e Compatibilidade de Formatos Esportivos  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Mapeamento de formatos esportivos suportados, comparação entre o motor atual e o novo Competition Format Engine, e avaliação arquitetural de formatos avançados (Dupla Eliminação e Sistema Suíço).

---

## 1. QUADRO COMPARATIVO GERAL: ATUAL VS. NOVO MOTOR

| Formato Esportivo | Descrição Estrutural | Suporte Atual (Fase 4.1) | Suporte no Novo Motor (Fase 4.2+) | Como é Modelado no Novo Motor |
|---|---|:---:|:---:|---|
| **1. Pontos Corridos Puro** | Todos contra todos em turno único; campeão definido por classificação | ✅ Parcial | ✅ Total | 1 `Stage` do tipo `round-robin`. Classificação direta é o resultado final. |
| **2. Pontos Corridos Ida e Volta** | Todos contra todos em turno e returno | ❌ Não suportado | ✅ Total | 1 `Stage` do tipo `round-robin` com `rounds: 'home-and-away'`. |
| **3. Grupos + Playoffs Tradicional** | Grupos clássicos (ex: 2 ou 4 grupos) com avanço direto para Quartas/Semis | ✅ Suportado (apenas 2 ou 4 grupos) | ✅ Total (1 a 32 grupos) | 2 `Stages`: `group-stage` $\to$ `single-elimination`. Chaveamento olímpico parametrizado. |
| **4. Mata-Mata Direto Puro** | Chave eliminatória simples (ex: 8, 16 ou 32 equipes) | ❌ Bloqueado (exige grupos prévios) | ✅ Total | 1 `Stage` do tipo `single-elimination` com participantes alimentados por `seed`. |
| **5. Mata-Mata com Byes** | Chave com número irregular de times (ex: 10 times em chave de 16) | ❌ Inexistente | ✅ Total | `single-elimination` com slots configurados com `isBye: true` (avanço automático). |
| **6. Grupos + Repescagem + Playoffs (Caso Voltz)** | 4 grupos de 3; 1º–4º vão direto às Quartas; 5º–12º disputam Repescagem | ❌ **BLOQUEADO** | ✅ **TOTAL (ZERO CÓDIGO CUSTOM)** | 3 `Stages`: `group-stage` $\to$ `play-in` (repescagem) $\to$ `single-elimination` (quartas/semis/final). |
| **7. Liga + Playoffs** | Fase única de liga classificando os Top 4 ou Top 8 para semifinais | ❌ Não suportado | ✅ Total | 2 `Stages`: `round-robin` $\to$ `single-elimination` alimentada pelo ranking da liga. |
| **8. Disputa de 3º Lugar** | Perdedores das semifinais disputam o bronze | ⚠️ Hardcoded na semifinal | ✅ Total | `Stage` independente do tipo `third-place` com feeds dos perdedores da semifinal. |
| **9. Regras Distintas por Fase** | Ex: Grupos em melhor de 3 sets (25/15), e Finais em melhor de 5 sets (25/15) | ❌ Ignorado no chaveamento | ✅ Total | Cada `StageDefinition` suporta `matchRulesOverride`. |
| **10. Eliminatória em Ida e Volta** | Mata-mata onde cada confronto tem jogo de ida, volta e Golden Set | ❌ Inexistente | ✅ Total | `Stage` com `seriesType: 'two-legged'` e `tieBreaker: 'golden-set'`. |
| **11. Dupla Eliminação (Double Elimination)** | Chave de Vencedores + Chave de Perdedores + Grande Final | ❌ Inexistente | 🟡 Compatível na Arquitetura (Fase 4.4) | 3 `Stages` conectados por DAG: `winner-bracket` + `loser-bracket` + `grand-final`. |
| **12. Sistema Suíço (Swiss System)** | Rodadas onde equipes com pontuações iguais se enfrentam | ❌ Inexistente | 🟡 Compatível na Arquitetura (Fase 4.4) | `Stage` com `custom-pairing` reavaliado rodada a rodada por delta de pontos. |

---

## 2. DETALHAMENTO DE CADA FORMATO NO NOVO MOTOR

### Formato 1: Liga / Pontos Corridos Puro
- **Estrutura:** 1 Fase (`StageType = 'round-robin'`).
- **Pairing:** Gerador de Berger em turno único.
- **Standings:** Apuração de pontos, vitórias, set ratio e point ratio.
- **Progression:** Sem fases subsequentes. O 1º colocado é declarado campeão automaticamente.

### Formato 2: Grupos + Playoffs Tradicional (Olímpico)
- **Estrutura:** 2 Fases:
  - Fase 1: `group-stage` (ex: 4 grupos de 4 times).
  - Fase 2: `single-elimination` (bracket size = 8).
- **Progression Feeds:**
  - QF-1: 1º Grupo A × 2º Grupo B
  - QF-2: 1º Grupo C × 2º Grupo D
  - QF-3: 1º Grupo B × 2º Grupo A
  - QF-4: 1º Grupo D × 2º Grupo C

### Formato 3: Mata-Mata Direto Puro
- **Estrutura:** 1 Fase (`StageType = 'single-elimination'`).
- **Origem dos Participantes:** Sorteio de potes ou cabeças de chave via `drawService.ts`. Não exige fase de grupos anterior.

### Formato 4: Mata-Mata com Byes
- **Exemplo:** 12 equipes em chave de 16 slots.
- **Mapeamento:**
  - Os Seeds 1 a 4 recebem Bye na primeira rodada (oitavas).
  - Os Seeds 5 a 12 disputam as oitavas ($5 \times 12, 6 \times 11, 7 \times 10, 8 \times 9$).
  - Os vencedores encontram os Seeds 1 a 4 nas quartas de final.
  - Zero criação de equipes falsas: slots com Bye avançam via evento `bye_advance`.

### Formato 5: Grupos + Repescagem + Playoffs (O Caso Voltz)
- **Estrutura:** 3 Fases:
  1. `stage-groups`: 4 grupos de 3 times (2 jogos por equipe).
  2. `stage-repechage`: 4 jogos ($5 \times 12, 6 \times 11, 7 \times 10, 8 \times 9$) alimentados pelo ranking intergrupos.
  3. `stage-playoffs`: Quartas, Semis, 3º Lugar e Final. Os Seeds 1 a 4 enfrentam os 4 sobreviventes da repescagem.
- **Resultado:** O campeonato é executado com precisão matemática absoluta sem nenhuma linha de código especial.

### Formato 6: Formato Híbrido com Regras Distintas por Fase
- O organizador pode definir:
  - `CompetitionConfig.matchRules`: setsToWin = 2 (Melhor de 3), sets de 25 e tie-break de 15.
  - `StageDefinition (Finais).matchRulesOverride`: setsToWin = 3 (Melhor de 5), sets de 25 e tie-break de 15.
- A súmula e a tela de partidas carregam automaticamente o validador correspondente à fase em disputa.

---

## 3. ANÁLISE DE FORMATOS AVANÇADOS: DUPLA ELIMINAÇÃO E SUÍÇO

### 3.1 Dupla Eliminação (Double Elimination)
- **Análise de Viabilidade:** O modelo em Grafo Direcionado Acíclico (DAG) projetado na Fase 4.2 já suporta conceitualmente a Dupla Eliminação:
  - Fase 1: `WinnerBracket` (Fase Eliminatória Principal).
  - Fase 2: `LoserBracket` (Alimentada pelos `match-result: outcome = 'loser'` de cada rodada da Chave dos Vencedores).
  - Fase 3: `GrandFinal` (Vencedor da Chave dos Vencedores × Vencedor da Chave dos Perdedores).
- **Decisão Arquitetural:** Não implementar na primeira entrega (Fase 4.3). A arquitetura é totalmente compatível e a implementação de UI e gerador de chave de repescagem dupla será agendada para a Fase 4.4.

### 3.2 Sistema Suíço (Swiss System)
- **Análise de Viabilidade:** No voleibol tradicional de quadra, o Sistema Suíço é raramente utilizado (muito comum em xadrez, e-sports e Magic). No entanto, o motor suporta a representação do Suíço dividindo-o em sub-fases onde cada rodada gera novos confrontos a partir da classificação parcial dos times com pontuação idêntica.
- **Decisão Arquitetural:** Deixar para versão futura sob demanda. O motor genérico de emparelhamento suportará plugins de algoritmo de pareamento suíço.
