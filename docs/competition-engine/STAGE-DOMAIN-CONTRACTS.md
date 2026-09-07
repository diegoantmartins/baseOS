# BaseOS — Contratos de Domínio de Stage, Round e MatchSlot

**Data:** 05/09/2026  
**Módulo:** `src/types/competitionConfig.ts`  
**Objetivo:** Especificação formal dos contratos de fases esportivas e intenções de partida em memória.

---

## 1. StageDefinition

Representa a configuração estrutural de uma fase da competição:

```typescript
export interface StageDefinition {
  /** Identificador estável da fase (ex: 'groups', 'play-in', 'knockout') */
  id: string;
  /** Identificador estável alternativo (sinônimo retrocompatível de id) */
  stageId?: string;
  /** Sequência ordinal da fase no torneio (1, 2, 3...) */
  order: number;
  /** Nome amigável de exibição (ex: 'Fase de Grupos', 'Play-In', 'Quartas de Final') */
  name: string;
  /** Tipo estrutural da fase */
  type: StageType;
  /** Lista de IDs de fases das quais esta fase depende para iniciar */
  dependsOnStageIds?: string[];
  /** Configuração específica para fases baseadas em grupos */
  groupConfig?: {
    groupsCount: number;
    teamsPerGroup: number;
    rounds?: 'single' | 'home-and-away';
  };
  /** Configuração específica para fases eliminatórias */
  eliminationConfig?: {
    bracketSize: number;
    seriesType?: 'single-match' | 'two-legged';
    hasThirdPlaceMatch?: boolean;
  };
  /** Regras de emparelhamento configuradas */
  pairingConfig?: PairingConfig;
  pairing?: PairingDefinition;
  /** Lista de feeds de participantes que alimentam os slots desta fase */
  participantFeeds?: ParticipantFeedDefinition[];
  participantFeed?: ParticipantFeedDefinition[];
  /** Rodadas canônicas pertencentes a esta fase */
  rounds?: RoundDefinition[];
  /** Rotas ou regras de progressão saindo desta fase */
  progressionRoutes?: ProgressionRoute[];
  progression?: ProgressionRule[];
  /** Sobrescrita opcional de regras de partida para esta fase */
  matchRulesOverride?: Partial<SetFormatConfig>;
  /** Critérios de desempate específicos para esta fase */
  tieBreakCriteriaOverride?: TiebreakCriterionId[];
}
```

### Tipos de Fase (`StageType`)
Preservados os 6 tipos canônicos da Fase 4.3:
- `group-stage`
- `round-robin`
- `play-in`
- `knockout`
- `third-place`
- `custom`

---

## 2. RoundDefinition

Representa uma rodada dentro de um estágio com identidade estável:

```typescript
export interface RoundDefinition {
  roundId: string;
  stageId: string;
  order: number;
  name: string;
  slotsCount?: number;
}
```

### Regras de Domínio:
- A identificação esportiva de uma rodada é governada por `roundId` (ex: `'qf'`, `'semis'`, `'final'`), nunca por índice posicional como `rounds[0]`.
- O campo `order` é meramente sequencial e de ordenação de exibição.

---

## 3. MatchSlot

Representa a intenção esportiva pura de um confronto:

```typescript
export interface MatchSlot {
  slotId: string;
  stageId: string;
  roundId: string;
  position: number;
  label?: string;
  participantA: ParticipantSlotState;
  participantB: ParticipantSlotState;
  progressionRoute?: ProgressionRoute;
  /** Identificador de registro de partida real no banco (null quando ainda não persistida) */
  matchRecordId?: string | null;
}
```

### Regras de Domínio:
- Não exige `team_a_id` ou `team_b_id` do banco para existir;
- Pode representar jogos cujos competidores ainda são desconhecidos (`status = 'unresolved'`);
- Pode representar folgas desportivas (`status = 'bye'`);
- O vínculo com partida física persistida é opcional via `matchRecordId`.
