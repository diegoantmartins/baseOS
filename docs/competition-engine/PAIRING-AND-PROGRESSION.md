# BASEOS — ARQUITETURA DO MOTOR DE PAIRING E PROGRESSÃO

**Data:** 05/09/2026  
**Documento:** Especificação Técnica Conceitual do Pairing Engine e Progression Engine  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Algoritmos de emparelhamento (Berger, Chaveamento Olímpico, Custom Mappings), tratamento limpo de Byes, conexões de progressão (Feeds) e disputa de 3º lugar sem hardcode.

---

## 1. VISÃO GERAL E DIAGNÓSTICO

Na Fase 4.1, a auditoria revelou dois grandes gargalos no chaveamento do BaseOS:

1. **Chaveamento Rígido em `playoffsService.ts`:**
   - O chaveamento eliminatório possui apenas templates estáticos para 1 grupo (semis 1A×4A, 2A×3A), 2 grupos (1A×2B, 1B×2A) ou 4 grupos (1A×2B, 1C×2D, 1B×2A, 1D×2C).
   - Se um campeonato tiver 3 grupos, 5 grupos, ou precisar classificar 3 equipes por grupo, ou tiver repescagem, o sistema é **incapaz** de gerar a chave.
2. **Propagação Manual e Acoplada:**
   - A função `advanceWinnerToNextRound` manipula posições fixas (`qfIndex * 2`, `sfIndex * 2`) assumindo uma árvore binária perfeita estrita.
   - Perdedores não podem ser direcionados para disputas secundárias (ex: 3º lugar, torneio consolação).
   - A existência de "Byes" (equipes pré-classificadas sem adversário na rodada) não é suportada nativamente.

Para solucionar isso de forma universal, dividimos a responsabilidade em dois motores independentes:
- **`PairingEngine`:** Define **quem joga contra quem** dentro de uma fase (geração de confrontos/tabela).
- **`ProgressionEngine`:** Define **como as vagas são preenchidas** a partir dos resultados de fases anteriores ou rankings.

---

## 2. O PAIRING ENGINE (MOTOR DE EMPARELHAMENTO)

O `PairingEngine` é um serviço de domínio puro que recebe participantes (ou vagas) e configurações de emparelhamento, gerando a lista de confrontos estruturados.

```text
Entrada:
  - Participants[] ou Slots[]
  - PairingRules (round-robin | seeded-bracket | custom-pairing)
Saída:
  - MatchBlueprint[] (confrontos com rodadas, slots e dependências)
```

### 2.1 Modalidades de Emparelhamento Suportadas

#### A. Round-Robin (Algoritmo de Berger)
Utilizado para fase de grupos e pontos corridos.
- **Número Par de Equipes ($N$):** Cada equipe joga $N-1$ rodadas. Utiliza o método canônico do polígono/carrossel (fixando o time 1 e girando os demais no sentido horário).
- **Número Ímpar de Equipes ($N$):** Adiciona-se uma vaga neutra de folga ("Bye"). A equipe emparelhada com o Bye folga naquela rodada. Nenhuma partida fantasma é criada no banco.
- **Turno Único vs. Ida e Volta:**
  - *Turno único:* $N(N-1)/2$ jogos.
  - *Ida e volta:* As rodadas do segundo turno invertem rigorosamente o mando de quadra (Team A $\leftrightarrow$ Team B).

#### B. Seeded Bracket (Chaveamento Eliminatório Tradicional)
Gera chaves eliminatórias clássicas com base em posições/cabeças de chave (Seeds 1..N):
- Para 8 equipes (Quartas de Final):
  - Jogo 1: Seed 1 × Seed 8
  - Jogo 2: Seed 4 × Seed 5
  - Jogo 3: Seed 2 × Seed 7
  - Jogo 4: Seed 3 × Seed 6
  - Semifinal 1: Vencedor J1 × Vencedor J2 (lado superior da chave)
  - Semifinal 2: Vencedor J3 × Vencedor J4 (lado inferior da chave)
- Para 16 equipes (Oitavas de Final):
  - $1 \times 16, 8 \times 9, 4 \times 13, 5 \times 12, 2 \times 15, 7 \times 10, 3 \times 14, 6 \times 11$.

#### C. Custom Pairing (Mapeamento Declarativo por Posições)
Permite que o regulamento da competição declare confrontos arbitrários entre posições ou rankings, sem exigir código customizado.

**Exemplo — Repescagem do Campeonato Voltz:**
```json
{
  "strategy": "custom-pairing",
  "pairings": [
    { "matchId": "REP-1", "home": { "feed": "overall-ranking", "position": 5 }, "away": { "feed": "overall-ranking", "position": 12 } },
    { "matchId": "REP-2", "home": { "feed": "overall-ranking", "position": 6 }, "away": { "feed": "overall-ranking", "position": 11 } },
    { "matchId": "REP-3", "home": { "feed": "overall-ranking", "position": 7 }, "away": { "feed": "overall-ranking", "position": 10 } },
    { "matchId": "REP-4", "home": { "feed": "overall-ranking", "position": 8 }, "away": { "feed": "overall-ranking", "position": 9 } }
  ]
}
```

---

## 3. TRATAMENTO LIMPO DE "BYES" (FOLGAS E VAGAS DIRETAS)

### 3.1 O Problema dos Anti-Patterns
Em muitos sistemas esportivos, adota-se o anti-pattern de criar equipes falsas com IDs fictícios como `"__BYE__"` ou `"FOLGA"`. Isso polui as tabelas de equipes, gera inconsistências em estatísticas, súmulas e cadastros de atletas.

### 3.2 Solução Arquitetural no BaseOS
No BaseOS, um **Bye** é modelado como uma propriedade de **Slot de Emparelhamento**:

```typescript
export interface PairingSlot {
  slotId: string;
  source: ParticipantFeedDefinition;
  isBye?: boolean;
}
```

- Se em um confronto eliminatório o slot `away` estiver configurado como `isBye: true`:
  1. A partida **não** requer disputa atlética.
  2. O `ProgressionEngine` resolve o slot `home` como vencedor imediato (`status = 'bye_advance'`).
  3. A súmula e a contagem de pontos da partida não são geradas (não afetam parciais de sets nem médias de pontos).
  4. A equipe avança instantaneamente para a próxima rodada da chave.

---

## 4. O PROGRESSION ENGINE (MOTOR DE PROGRESSÃO)

O `ProgressionEngine` é responsável por resolver as dependências entre fases e preencher as equipes nos confrontos das fases seguintes à medida que os resultados são consolidados.

```text
                               Progression Engine
                              ┌──────────────────┐
   Stage Concluído ──────────►│ Resolve Feeds    ├──────────► Preenche Slots da
 (Grupos / Repescagem / etc.) │ Standings / H2H  │            Próxima Fase
                              └──────────────────┘
```

### 4.1 Tipos de Alimentadores de Vagas (Participant Feeds)

O sistema define uma união discriminada extensível de fontes de participantes:

```typescript
export type ParticipantFeedDefinition =
  | {
      type: 'direct-team';
      teamId: string;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex: number;
      position: number; // 1 = 1º lugar do grupo, 2 = 2º lugar, etc.
    }
  | {
      type: 'overall-ranking';
      stageId: string;
      position: number; // 1 = 1º geral, 5 = 5º geral, etc.
      filter?: 'group-winners-only' | 'group-runners-up-only' | 'non-winners' | 'all';
    }
  | {
      type: 'match-result';
      matchId: string;
      outcome: 'winner' | 'loser'; // 'winner' para avanço normal; 'loser' para disputa de 3º
    }
  | {
      type: 'seed';
      seedNumber: number; // Definido em sorteio
    }
  | {
      type: 'bye';
    };
```

---

## 5. RESOLUÇÃO FORMAL DA DISPUTA DE 3º LUGAR

A disputa de 3º lugar deixa de ser um anexo embutido na semifinal. Ela é modelada como uma **Fase Concreta** (`StageDefinition`) independente:

```typescript
export const ThirdPlaceStageDefinition: StageDefinition = {
  id: 'stage-third-place',
  order: 5,
  name: 'Disputa de 3º Lugar',
  type: 'third-place',
  dependsOnStageIds: ['stage-semifinals'],
  participantFeeds: [
    {
      type: 'match-result',
      matchId: 'SF-1',
      outcome: 'loser'
    },
    {
      type: 'match-result',
      matchId: 'SF-2',
      outcome: 'loser'
    }
  ]
};
```

### Mecânica de Resolução:
1. Quando a fase `stage-semifinals` é marcada como `completed`:
2. O `ProgressionEngine` localiza os perdedores das duas semifinais.
3. Alimenta automaticamente o confronto de 3º lugar com as duas equipes.
4. A partida final do campeonato (`stage-finals`) recebe os dois vencedores simultaneamente.

---

## 6. FLUXO DE EXECUÇÃO: DA CLASSIFICAÇÃO AO PRÓXIMO CONFRONTO

O ciclo de progressão opera sob um modelo reativo acionado por eventos de domínio:

```text
[Partida Finalizada]
        │
        ▼
[standingsService.recalculate(stageId)]
        │
        ▼
[Todos os jogos da fase concluídos?]
        ├── NÃO ──► [Aguardar próximas partidas]
        │
        └── SIM  ──► [Marcar StageRecord.status = 'completed']
                          │
                          ▼
             [ProgressionEngine.triggerAdvancement(completedStageId)]
                          │
                          ├── 1. Identifica fases dependentes (DAG)
                          ├── 2. Extrai classificação / vencedores requeridos
                          ├── 3. Resolve os ParticipantFeeds de cada slot
                          ├── 4. Popula os confrontos da nova fase
                          └── 5. Marca novo StageRecord.status = 'ready'
```

Esse fluxo garante que nenhuma chave seja gerada prematuramente com dados parciais ou desatualizados, eliminando bugs de equipes erradas avançando na árvore eliminatória.
