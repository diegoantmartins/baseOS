# BASEOS — PROVA ARQUITETURAL: CASO CAMPEONATO VOLTZ

**Data:** 05/09/2026  
**Documento:** Demonstração e Prova de Expressividade Arquitetural para o Campeonato Voltz  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Instanciação 100% declarativa em JSON/TypeScript do regulamento oficial da Voltz sem nenhuma linha de código específico (`zero custom code`).

---

## 1. O DESAFIO DE EXPRESSIVIDADE

O Campeonato Voltz foi selecionado na Fase 4.1 como o teste de fogo para a nova arquitetura do BaseOS. A regra primordial da Fase 4.2 é:

$$\neg \exists (\text{if competition.name === 'Voltz'}) \quad \wedge \quad \neg \exists (\text{if format === 'voltz'}) \quad \wedge \quad \neg \exists (\text{VoltzService})$$

Se o motor exigir qualquer condicional especial para suportar a Voltz, a arquitetura falhou.

Abaixo, apresentamos a **prova técnica** de que o novo `Competition Format Engine` representa todas as nuances da Voltz puramente como configuração de dados no `CompetitionConfigV2`.

---

## 2. ESPECIFICAÇÃO ESPORTIVA DA VOLTZ

- **Participantes:** 12 equipes.
- **Fase 1 (Grupos):** 4 grupos de 3 equipes ($A, B, C, D$).
  - Confrontos: Algoritmo de Berger em turno único (3 jogos por grupo $\to$ total de 12 jogos). Cada equipe joga 2 vezes.
  - Regras de Partida: Melhor de 3 sets (25 / 25 / 15 com vantagem mínima de 2 pontos aberta).
  - Pontuação FIVB: 3 pts (vitória 2×0), 2 pts (vitória 2×1), 1 pt (derrota 1×2), 0 pts (derrota 0×2).
  - Desempate: Pontos $\to$ Vitórias $\to$ Confronto Direto (Mini-tabela) $\to$ Set Ratio $\to$ Point Ratio $\to$ Sorteio.
- **Transição 1 $\to$ 2/3 (Ranking Geral Intergrupos):**
  - Agregação Padrão Olímpico (`by-group-position-first`):
    - Seeds 1 a 4: 1ºs colocados de cada grupo ($A1, B1, C1, D1$), ordenados por campanha geral. **Classificam-se direto para as Quartas de Final**.
    - Seeds 5 a 8: 2ºs colocados de cada grupo ($A2, B2, C2, D2$), ordenados por campanha geral.
    - Seeds 9 a 12: 3ºs colocados de cada grupo ($A3, B3, C3, D3$), ordenados por campanha geral.
    - Seeds 5 a 12: **Disputam a Fase de Repescagem**.
- **Fase 2 (Repescagem / Play-In):**
  - 4 confrontos eliminatórios em jogo único:
    - Jogo R1: Seed 5 × Seed 12
    - Jogo R2: Seed 6 × Seed 11
    - Jogo R3: Seed 7 × Seed 10
    - Jogo R4: Seed 8 × Seed 9
  - Os 4 vencedores avançam para as Quartas de Final.
- **Fase 3 (Playoffs - Quartas, Semis e Finais):**
  - Quartas de Final: Os 4 classificados diretos (Seeds 1 a 4) enfrentam os 4 classificados da repescagem:
    - QF-1: Seed 1 × Vencedor R4 (ou chaveamento olímpico equivalente)
    - QF-2: Seed 4 × Vencedor R1
    - QF-3: Seed 2 × Vencedor R3
    - QF-4: Seed 3 × Vencedor R2
  - Semifinais: Vencedor QF-1 × Vencedor QF-2 / Vencedor QF-3 × Vencedor QF-4.
  - Finais: Vencedores disputam o Título; perdedores disputam o 3º Lugar.

---

## 3. INSTANCIAÇÃO CANÔNICA EM `CompetitionConfigV2` (JSON)

Abaixo está o objeto de configuração exato que será gravado no campo `competitions.config` para rodar o torneio Voltz:

```json
{
  "version": 2,
  "matchRules": {
    "setsToWin": 2,
    "pointsPerSet": 25,
    "pointsPerTieBreakSet": 15,
    "hasAdvantage": true,
    "walkoverRules": {
      "setsAwardedToWinner": 2,
      "setScoreString": "25-0",
      "pointsAwardedToWinner": 3,
      "pointsAwardedToLoser": 0,
      "statisticsImpact": "include-scores"
    }
  },
  "scoringRules": {
    "profile": "fivb-standard",
    "pointsMatrix": {
      "win2x0": 3,
      "win2x1": 2,
      "loss1x2": 1,
      "loss0x2": 0,
      "walkoverWin": 3,
      "walkoverLoss": 0
    }
  },
  "tieBreakCriteriaOrder": [
    "points",
    "wins",
    "head_to_head_mini_table",
    "set_ratio",
    "point_ratio",
    "deterministic_draw"
  ],
  "format": {
    "formatType": "groups-repechage-playoffs",
    "stages": [
      {
        "id": "stage-groups",
        "order": 1,
        "name": "Fase de Grupos",
        "type": "group-stage",
        "dependsOnStageIds": [],
        "groupConfig": {
          "groupsCount": 4,
          "teamsPerGroup": 3,
          "rounds": "single"
        },
        "participantFeeds": []
      },
      {
        "id": "stage-repechage",
        "order": 2,
        "name": "Repescagem",
        "type": "play-in",
        "dependsOnStageIds": ["stage-groups"],
        "eliminationConfig": {
          "bracketSize": 8,
          "seriesType": "single-match"
        },
        "participantFeeds": [
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 5 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 12 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 6 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 11 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 7 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 10 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 8 },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 9 }
        ]
      },
      {
        "id": "stage-quarterfinals",
        "order": 3,
        "name": "Quartas de Final",
        "type": "single-elimination",
        "dependsOnStageIds": ["stage-groups", "stage-repechage"],
        "eliminationConfig": {
          "bracketSize": 8,
          "seriesType": "single-match"
        },
        "participantFeeds": [
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 1 },
          { "type": "match-result", "matchId": "REP-4", "outcome": "winner" },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 4 },
          { "type": "match-result", "matchId": "REP-1", "outcome": "winner" },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 2 },
          { "type": "match-result", "matchId": "REP-3", "outcome": "winner" },
          { "type": "overall-ranking", "stageId": "stage-groups", "position": 3 },
          { "type": "match-result", "matchId": "REP-2", "outcome": "winner" }
        ]
      },
      {
        "id": "stage-semifinals",
        "order": 4,
        "name": "Semifinais",
        "type": "single-elimination",
        "dependsOnStageIds": ["stage-quarterfinals"],
        "eliminationConfig": {
          "bracketSize": 4,
          "seriesType": "single-match"
        },
        "participantFeeds": [
          { "type": "match-result", "matchId": "QF-1", "outcome": "winner" },
          { "type": "match-result", "matchId": "QF-2", "outcome": "winner" },
          { "type": "match-result", "matchId": "QF-3", "outcome": "winner" },
          { "type": "match-result", "matchId": "QF-4", "outcome": "winner" }
        ]
      },
      {
        "id": "stage-finals",
        "order": 5,
        "name": "Grande Final",
        "type": "single-elimination",
        "dependsOnStageIds": ["stage-semifinals"],
        "eliminationConfig": {
          "bracketSize": 2,
          "seriesType": "single-match"
        },
        "participantFeeds": [
          { "type": "match-result", "matchId": "SF-1", "outcome": "winner" },
          { "type": "match-result", "matchId": "SF-2", "outcome": "winner" }
        ]
      },
      {
        "id": "stage-third-place",
        "order": 6,
        "name": "Disputa de 3º Lugar",
        "type": "third-place",
        "dependsOnStageIds": ["stage-semifinals"],
        "eliminationConfig": {
          "bracketSize": 2,
          "seriesType": "single-match"
        },
        "participantFeeds": [
          { "type": "match-result", "matchId": "SF-1", "outcome": "loser" },
          { "type": "match-result", "matchId": "SF-2", "outcome": "loser" }
        ]
      }
    ]
  }
}
```

---

## 4. AMBIGUIDADES DO REGULAMENTO VOLTZ E COMO O MOTOR AS RESOLVE

O regulamento da Voltz analisado na Fase 4.1 não especificava detalhadamente:
1. **Cruzamento exato das Quartas:** Se o Seed 1 enfrenta o vencedor do jogo $8 \times 9$ (chave fixa pré-definida) ou se há um re-chaveamento (re-seed) onde o Seed 1 pega o pior seed sobrevivente da repescagem.
   - **Como o motor resolve:** Como os `participantFeeds` são declarativos, ambas as opções são suportadas! Se a organização optar por chave fixa, usa a configuração acima; se optar por re-seeding, basta configurar o feed como `{ "type": "reseeded-winner", "reseedRank": 4 }`.
2. **Empate triplo no grupo:** O regulamento diz apenas "confronto direto".
   - **Como o motor resolve:** Aplica automaticamente a Mini-Tabela canônica da FIVB especificada no `TieBreakEngine`, garantindo ordenação estritamente determinística e sem travamento de sort.

---

## 5. CONCLUSÃO DA PROVA ARQUITETURAL

O Campeonato Voltz é **plenamente executável** sob a nova arquitetura sem:
- Nenhuma menção a "Voltz" no código;
- Nenhum serviço customizado;
- Nenhuma regra bifurcada na interface ou no backend.

O BaseOS atinge aqui o seu objetivo de maturidade de produto: fornecer **capacidades primitivas combináveis** que empoderam qualquer organizador a executar seu campeonato com precisão profissional.
