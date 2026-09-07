# BaseOS — Contrato Canônico de ParticipantReference e Resolução

**Data:** 05/09/2026  
**Módulos:** `src/types/competitionConfig.ts` e `src/services/participantResolutionEngine.ts`  
**Objetivo:** Especificação técnica formal de como participantes esportivos são referenciados e resolvidos.

---

## 1. Contrato da Discriminated Union

O tipo `ParticipantReference` suporta 8 modalidades fundamentais de qualificação esportiva:

```typescript
export type ParticipantReference =
  | {
      type: 'resolved-team';
      teamId: string;
      teamName?: string;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex: number;
      position: number;
    }
  | {
      type: 'overall-ranking';
      stageId: string;
      position: number;
      filter?: 'group-winners-only' | 'group-runners-up-only' | 'non-winners' | 'all';
    }
  | {
      type: 'stage-position';
      stageId: string;
      position: number;
    }
  | {
      type: 'match-winner';
      slotId: string;
    }
  | {
      type: 'match-loser';
      slotId: string;
    }
  | {
      type: 'seed';
      seedNumber: number;
    }
  | {
      type: 'bye';
    };
```

---

## 2. Estados de Resolução de um Participante (`ParticipantSlotState`)

Para eliminar o uso ambíguo de `null`, o domínio define 4 estados inequívocos:

```typescript
export type ParticipantResolutionStatus = 'resolved' | 'unresolved' | 'invalid' | 'bye';

export interface ParticipantSlotState {
  side: 'A' | 'B';
  reference: ParticipantReference;
  status: ParticipantResolutionStatus;
  resolvedTeamId: string | null;
  resolvedTeamName?: string;
  displayPlaceholder: string;
  isBye: boolean;
}
```

### Semântica dos Estados:

| Status | `resolvedTeamId` | `isBye` | Descrição |
| :--- | :---: | :---: | :--- |
| `'resolved'` | `string` (não nulo) | `false` | A equipe é conhecida e classificada com certeza. |
| `'unresolved'` | `null` | `false` | A vaga está em disputa e depende de partidas futuras ou apuração em andamento. |
| `'invalid'` | `null` | `false` | A referência aponta para um recurso inexistente ou impossível (ex: posição 99 num grupo de 3). |
| `'bye'` | `null` | `true` | Folga esportiva regulamentar; o adversário avança automaticamente. |

---

## 3. Tratamento Nativo de BYE

Quando uma referência for do tipo `{ type: 'bye' }`:
- Não é criada uma equipe "BYE" no cadastro (`teams`);
- Não é gerado um `MatchRecord` falso no banco;
- O `ParticipantResolutionEngine` e o `GenericProgressionEngine` detectam que um dos lados do confronto é `isBye = true` e automaticamente qualificam o adversário do lado oposto como vencedor do slot.
