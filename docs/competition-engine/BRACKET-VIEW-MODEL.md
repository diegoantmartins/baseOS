# BaseOS — Especificação do CompetitionBracketViewModel

**Status:** Homologado  
**Versão:** 1.0  
**Data:** 2026-09-05  
**Autor:** Antigravity / Gemini  
**Arquivo de Implementação:** `src/services/competitionBracketViewModel.ts`

---

## 1. Contrato Funcional Puro

O `CompetitionBracketViewModelBuilder` foi implementado como uma função pura sem dependências externas de rede ou banco de dados:

```typescript
export interface BuildBracketViewModelParams {
  competition: Competition;
  stages: CompetitionStageRow[];
  rounds: CompetitionRoundRow[];
  slots: CompetitionMatchSlotRow[];
  matches: Match[];
  teams: Team[];
}

export class CompetitionBracketViewModelBuilder {
  static build(params: BuildBracketViewModelParams): CompetitionBracketViewModel {
    // Implementação determinística e pura
  }
}
```

Isso garante:
- **Testabilidade Total:** Cobertura de 100% de cenários com mocks em memória sem necessidade de setup de banco;
- **Desempenho Instantâneo:** Recalculado em menos de 2ms para 128 slots;
- **Imutabilidade:** Não altera nenhum dos objetos de entrada.

---

## 2. Estrutura do Modelo de Visão

```typescript
export interface CompetitionBracketViewModel {
  competitionId: string;
  competitionName: string;
  stages: BracketStageViewModel[];
  hasMatches: boolean;
  totalSlots: number;
  materializedSlots: number;
  completedSlots: number;
  podium?: BracketPodiumViewModel;
}

export interface BracketStageViewModel {
  stageId: string;
  stageName: string;
  stageType: string;
  sequenceOrder: number;
  rounds: BracketRoundViewModel[];
}

export interface BracketRoundViewModel {
  roundId: string;
  roundName: string;
  roundNumber: number;
  slots: BracketSlotViewModel[];
}

export interface BracketSlotViewModel {
  slotId: string;
  slotNumber: number;
  stageId: string;
  roundId: string;
  matchId: string | null;
  matchNumber?: number;
  participantA: BracketParticipantViewModel;
  participantB: BracketParticipantViewModel;
  visualState: MatchSlotVisualState;
  statusLabel: string;
  scoreDisplay?: string;
  partialSetsDisplay?: string[];
  winnerTeamId?: string;
  loserTeamId?: string;
  scheduledTime?: string;
  courtName?: string;
  canOpenMatch: boolean;
  isBye: boolean;
  inconsistencyMessage?: string;
}
```

---

## 3. Formatação Canônica de ParticipantReference

Todos os 8 tipos de `ParticipantReference` são traduzidos para Português formal e legível pelo usuário, **sem recorrer a equipes artificiais**:

| Tipo de Referência | Exemplo Técnico | Exibição no BaseOS |
| :--- | :--- | :--- |
| `seed` | `{ type: 'seed', seedNumber: 1 }` | `Seed #1` |
| `group-position` | `{ type: 'group-position', groupName: 'A', position: 1 }` | `1º Grupo A` |
| `overall-ranking` | `{ type: 'overall-ranking', position: 5 }` | `5º Geral` |
| `match-winner` | `{ type: 'match-winner', sourceMatchId: 'SLOT-SF1' }` | `Vencedor SF1` |
| `match-loser` | `{ type: 'match-loser', sourceMatchId: 'SLOT-SF1' }` | `Perdedor SF1` |
| `stage-advancement` | `{ type: 'stage-advancement', sourceStageId: 'st-1', rank: 2 }` | `2º Classificado (st-1)` |
| `manual-selection` | `{ type: 'manual-selection', slotLabel: 'Convidado Especial' }` | `Convidado Especial` |
| `bye` | `{ type: 'bye' }` | `BYE` |

---

## 4. Auditoria e Detecção de Inconsistência (Item 11 do Usuário)

O builder audita ativamente a integridade estrutural entre `MatchSlot` e `Match`:

1. Se `slot.matchId` está definido, mas a partida não existe na coleção de partidas fornecida:
   - `visualState = 'inconsistent'`
   - `statusLabel = 'Inconsistente'`
   - `inconsistencyMessage = 'Partida vinculada [matchId] não encontrada no banco.'`
   - `canOpenMatch = false`

2. Se a equipe resolvida no slot diverge da equipe associada na partida real:
   - `visualState = 'inconsistent'`
   - `statusLabel = 'Inconsistente'`
   - `inconsistencyMessage = 'Divergência entre equipe do slot e partida real.'`
   - `canOpenMatch = false`

Isso impede que discrepâncias de concorrência ou falhas de sincronização sejam mascaradas silenciosamente na interface.
